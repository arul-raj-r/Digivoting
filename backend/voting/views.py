import csv
import secrets
import hashlib
from datetime import timedelta
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.throttling import ScopedRateThrottle

from authentication.models import User
from elections.models import Election, Candidate, EligibleVoter
from elections.audit import log_election_action
from elections.permissions import synchronize_election_lifecycle
from voting.models import Ballot, ElectionResult, CandidateResult, BallotConfirmationToken, VotingAuthorization
from voting.crypto import encrypt_ballot_choice
from voting.tally import compute_election_tally
from voting.serializers import (
    BallotViewSerializer,
    BallotConfirmRequestSerializer,
    BallotSubmitRequestSerializer,
    ElectionResultSerializer
)


class BallotRateThrottle(ScopedRateThrottle):
    scope = 'vote'


def check_election_and_voter_eligibility(election_id, request_user):
    """
    Helper to validate election existence, active status, voter roll presence,
    and verification requirements for voting.
    """
    try:
        election = Election.objects.get(pk=election_id)
    except (Election.DoesNotExist, ValueError):
        return None, None, Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

    synchronize_election_lifecycle(election)
    if election.status != 'active':
        return None, None, Response(
            {"error": f"Voting is not open for this election. Status is currently '{election.status}'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Look up voter on the roll by authenticated user's email
    voter = EligibleVoter.objects.filter(election=election, email__iexact=request_user.email).first()
    if not voter:
        return None, None, Response(
            {"error": "You are not registered on the eligible voter roll for this election."},
            status=status.HTTP_403_FORBIDDEN
        )

    if voter.has_voted:
        return None, None, Response(
            {"error": "You have already cast your vote in this election. Multiple voting is strictly prohibited."},
            status=status.HTTP_409_CONFLICT
        )

    # Check verification requirements
    verification = getattr(election, 'verification_config', None)
    if verification:
        if verification.require_biometric_verification:
            return None, None, Response(
                {"error": "Biometric verification is required for this election. Biometric matching infrastructure is not enabled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if verification.require_webcam_verification and voter.verification_status not in ['FACE_VERIFIED', 'VERIFIED']:
            return None, None, Response(
                {"error": "Webcam identity verification is required for this election. Please verify your face before voting."},
                status=status.HTTP_400_BAD_REQUEST
            )

    return election, voter, None


class BallotEligibilityView(APIView):
    """
    GET /api/elections/<id>/ballot/
    Checks voter eligibility and retrieves ballot options (candidates).
    Enforces active status, voter roll membership, non-voted status, and verification checks.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [BallotRateThrottle]

    def get(self, request, election_id):
        election, voter, error_response = check_election_and_voter_eligibility(election_id, request.user)
        if error_response:
            return error_response

        candidates = election.candidates.all().order_by('display_order', 'added_at')
        serializer = BallotViewSerializer({
            'election': election,
            'candidates': candidates,
            'voter': voter
        }, context={'request': request})

        return Response(serializer.data, status=status.HTTP_200_OK)


class BallotConfirmView(APIView):
    """
    POST /api/elections/<id>/ballot/confirm/
    Issues a short-lived (2 minute) single-use confirmation token for the selected candidate.
    Does not cast the vote yet.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [BallotRateThrottle]

    def post(self, request, election_id):
        election, voter, error_response = check_election_and_voter_eligibility(election_id, request.user)
        if error_response:
            return error_response

        serializer = BallotConfirmRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        candidate_id = serializer.validated_data['candidate_id']
        candidate = election.candidates.filter(id=candidate_id).first()
        if not candidate:
            return Response(
                {"error": "The selected candidate does not belong to this election."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate cryptographic single-use confirmation token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=2)

        # Invalidate any previous unredeemed confirmation tokens for this voter/election
        BallotConfirmationToken.objects.filter(election=election, voter=voter, used=False).update(used=True)

        BallotConfirmationToken.objects.create(
            election=election,
            voter=voter,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )

        return Response({
            "confirmation_token": raw_token,
            "expires_in_seconds": 120,
            "expires_at": expires_at.isoformat(),
            "candidate": {
                "id": str(candidate.id),
                "full_name": candidate.full_name,
                "party_or_affiliation": candidate.party_or_affiliation,
            }
        }, status=status.HTTP_200_OK)


class BallotSubmitView(APIView):
    """
    POST /api/elections/<id>/ballot/submit/
    Final atomic vote submission:
    - Verifies token inside transaction with select_for_update() on EligibleVoter and BallotConfirmationToken.
    - Encrypts choice using envelope encryption (per-election key).
    - Inserts Ballot with NO voter FK and minute-truncated timestamp.
    - Marks has_voted=True and token as used.
    - Logs audit event without exposing candidate choice.
    - Rate-throttled.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [BallotRateThrottle]

    def post(self, request, election_id):
        serializer = BallotSubmitRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_token = serializer.validated_data['confirmation_token']
        candidate_id = serializer.validated_data['candidate_id']
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        if election.status != 'active':
            return Response(
                {"error": f"Voting is closed for this election. Current status: '{election.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        candidate = election.candidates.filter(id=candidate_id).first()
        if not candidate:
            return Response(
                {"error": "The selected candidate does not belong to this election."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atomic submission transaction with explicit row-level locks
        from django.db import OperationalError
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    # 1. Lock and validate confirmation token or voting authorization token
                    token_record = BallotConfirmationToken.objects.select_for_update().filter(
                        token_hash=token_hash,
                        election=election
                    ).first()

                    auth_record = None
                    if not token_record:
                        auth_record = VotingAuthorization.objects.select_for_update().filter(
                            token_hash=token_hash,
                            election=election
                        ).first()

                    if not token_record and not auth_record:
                        return Response(
                            {"error": "Invalid or unrecognized confirmation or authorization token."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    is_used = token_record.used if token_record else auth_record.consumed
                    if is_used:
                        return Response(
                            {"error": "This voting authorization token has already been redeemed."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    token_expires_at = token_record.expires_at if token_record else auth_record.expires_at
                    if token_expires_at <= timezone.now():
                        return Response(
                            {"error": "Authorization token has expired. Please re-verify or re-confirm your choice."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    voter_obj = token_record.voter if token_record else auth_record.voter
                    if voter_obj.email.lower() != request.user.email.lower():
                        return Response(
                            {"error": "Voting token does not belong to the authenticated user."},
                            status=status.HTTP_403_FORBIDDEN
                        )

                    # 2. Lock and re-validate EligibleVoter row
                    voter_record = EligibleVoter.objects.select_for_update().filter(
                        id=voter_obj.id
                    ).first()

                    if not voter_record:
                        return Response(
                            {"error": "Voter registration record not found."},
                            status=status.HTTP_404_NOT_FOUND
                        )

                    if voter_record.has_voted:
                        return Response(
                            {"error": "You have already cast a ballot in this election."},
                            status=status.HTTP_409_CONFLICT
                        )

                    # 3. Encrypt choice using per-election envelope encryption
                    encrypted_payload = encrypt_ballot_choice(election, str(candidate.id))

                    # 4. Insert Ballot record with deliberate anonymity trade-off
                    # Truncated to the minute to prevent timestamp correlation side channels
                    submission_time = timezone.now().replace(second=0, microsecond=0)
                    ballot = Ballot.objects.create(
                        election=election,
                        encrypted_choice=encrypted_payload,
                        submitted_at=submission_time
                    )

                    # 5. Flip has_voted to True, set voted_at, and mark tokens consumed
                    voter_record.has_voted = True
                    voter_record.voted_at = timezone.now()
                    voter_record.save(update_fields=['has_voted', 'voted_at'])

                    if token_record:
                        token_record.used = True
                        token_record.save(update_fields=['used'])

                    if auth_record:
                        auth_record.consumed = True
                        auth_record.consumed_at = timezone.now()
                        auth_record.save(update_fields=['consumed', 'consumed_at'])

                    # Invalidate any other active authorizations for this voter in this election
                    VotingAuthorization.objects.filter(election=election, voter=voter_record, consumed=False).update(
                        consumed=True,
                        consumed_at=timezone.now()
                    )

                    receipt_id = f"VOTE-{secrets.token_hex(6).upper()}"

                    # 6. Audit logging: strictly NO candidate choice logged anywhere
                    log_election_action(
                        election=election,
                        action='vote_submitted',
                        actor=None, # Anonymize actor connection to specific ballot choice
                        details={
                            'event': 'ballot_cast',
                            'receipt_id': receipt_id,
                            'ballot_id': str(ballot.id),
                            'submitted_at': submission_time.isoformat()
                        },
                        request=request
                    )

                return Response({
                    "success": True,
                    "message": "Your vote has been successfully cast and sealed. Your choice is protected with cryptographic confidentiality.",
                    "receipt_id": receipt_id,
                    "ballot_id": str(ballot.id),
                    "timestamp": submission_time.isoformat(),
                    "election_title": election.title
                }, status=status.HTTP_201_CREATED)
            except OperationalError:
                if attempt < max_retries - 1:
                    time.sleep(0.05 * (attempt + 1))
                    continue
                return Response(
                    {"error": "Concurrent vote submission detected. Only one ballot may be cast per eligible voter."},
                    status=status.HTTP_409_CONFLICT
                )


class ElectionResultsGenerateView(APIView):
    """
    POST /api/elections/<id>/results/generate/
    Owner-only endpoint to calculate/recompute results tally on demand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Only the election creator can generate results."}, status=status.HTTP_403_FORBIDDEN)

        tally_result = compute_election_tally(election, force=True)
        if not tally_result.get('integrity_verified'):
            return Response({
                "error": "Tally cryptographic integrity check failed.",
                "details": tally_result
            }, status=status.HTTP_400_BAD_REQUEST)

        result = election.election_result
        serializer = ElectionResultSerializer(result, context={'request': request})
        return Response({
            "message": "Election results computed and verified successfully.",
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class ElectionResultsUnpublishView(APIView):
    """
    POST /api/elections/<id>/results/unpublish/
    Owner-only endpoint to unpublish results.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Only the election creator can unpublish results."}, status=status.HTTP_403_FORBIDDEN)

        result = getattr(election, 'election_result', None)
        if not result or not result.is_published:
            return Response({"message": "Results are not currently published."}, status=status.HTTP_200_OK)

        result.is_published = False
        result.save()

        log_election_action(
            election=election,
            action='results_unpublished',
            actor=request.user,
            details={'unpublished_at': timezone.now().isoformat()},
            request=request
        )

        return Response({"message": "Election results unpublished successfully."}, status=status.HTTP_200_OK)


class ElectionResultsPublishView(APIView):
    """
    POST /api/elections/<id>/results/publish/
    Owner-only endpoint to manually publish verified results for an election
    with results_visibility == 'manual'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Only the election creator can publish results."}, status=status.HTTP_403_FORBIDDEN)

        if election.status != 'completed':
            return Response(
                {"error": f"Cannot publish results while election status is '{election.status}'. Election must be 'completed'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        rules = getattr(election, 'rules', None)
        if rules and rules.results_visibility != 'manual':
            return Response(
                {"error": f"Manual publishing is only available when results visibility is set to 'manual'. Current visibility: '{rules.results_visibility}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Compute or verify tally
        tally_result = compute_election_tally(election)
        if not tally_result.get('integrity_verified'):
            return Response({
                "error": "Cannot publish results: tally cryptographic integrity check failed. Mismatch between cast ballots and registered voters.",
                "details": tally_result
            }, status=status.HTTP_400_BAD_REQUEST)

        result = election.election_result
        result.is_published = True
        result.published_at = timezone.now()
        result.save()

        log_election_action(
            election=election,
            action='results_published',
            actor=request.user,
            details={'method': 'manual_publish', 'published_at': result.published_at.isoformat()},
            request=request
        )

        serializer = ElectionResultSerializer(result, context={'request': request})
        return Response({
            "message": "Election results published successfully.",
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class ElectionResultsView(APIView):
    """
    GET /api/elections/<id>/results/
    - Creator / Admin: Sees results preview even before publication (clearly labeled preview=True).
    - Public / Voters: Only see results if status == 'completed' AND is_published == True.
      Otherwise receives a non-revealing 'not available' response.
    - Includes tie detection and small-electorate disclaimer (<10 ballots).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_owner = election.created_by == user

        # Check if tally has been computed
        result = getattr(election, 'election_result', None)
        if not result:
            if election.status in ['completed', 'cancelled']:
                # Compute tally on demand for completed/stopped elections
                compute_election_tally(election)
                result = getattr(election, 'election_result', None)

        if not result or not result.integrity_verified:
            if is_owner:
                return Response({
                    "preview": True,
                    "available": False,
                    "message": "Results are not yet computed or verified for this election.",
                    "status": election.status,
                    "integrity_verified": result.integrity_verified if result else False
                }, status=status.HTTP_200_OK)
            return Response(
                {"available": False, "message": "Results are not available for this election."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Visibility gating for non-owners
        if not is_owner:
            if election.status != 'completed' or not result.is_published:
                return Response(
                    {"available": False, "message": "Results for this election are not yet available."},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = ElectionResultSerializer(result, context={'request': request})
        data = serializer.data
        data['preview'] = is_owner and not result.is_published
        data['available'] = True

        return Response(data, status=status.HTTP_200_OK)


class ElectionReportsParticipationView(APIView):
    """
    GET /api/elections/<id>/reports/participation/
    Owner-only participation report.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        total_eligible = election.eligible_voters.count()
        voted_count = election.eligible_voters.filter(has_voted=True).count()
        pending_count = total_eligible - voted_count
        turnout_pct = round((voted_count / total_eligible * 100), 2) if total_eligible > 0 else 0.0

        return Response({
            "election_id": str(election.id),
            "title": election.title,
            "status": election.status,
            "total_eligible_voters": total_eligible,
            "ballots_cast": voted_count,
            "pending_voters": pending_count,
            "turnout_percentage": turnout_pct,
        }, status=status.HTTP_200_OK)


class ElectionReportsCandidatesView(APIView):
    """
    GET /api/elections/<id>/reports/candidates/
    Owner-only candidate configuration report.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        candidates = election.candidates.all().order_by('display_order', 'added_at')
        data = [{
            "id": str(c.id),
            "full_name": c.full_name,
            "party_or_affiliation": c.party_or_affiliation,
            "bio_length": len(c.bio or ''),
            "has_photo": bool(c.photo),
            "display_order": c.display_order,
            "added_at": c.added_at.isoformat()
        } for c in candidates]

        return Response({
            "election_id": str(election.id),
            "candidates_count": len(data),
            "candidates": data
        }, status=status.HTTP_200_OK)


class ElectionReportsExportView(APIView):
    """
    GET /api/elections/<id>/reports/export/?format=csv
    Owner-only CSV export of election results and turnout metrics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def perform_content_negotiation(self, request, force=False):
        # Allow custom query parameter ?format=csv or ?format=pdf without DRF renderer restriction
        renderers = self.get_renderers()
        return (renderers[0], renderers[0].media_type)

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if election.created_by != user:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        result = getattr(election, 'election_result', None)
        total_eligible = election.eligible_voters.count()
        total_voted = result.total_ballots_cast if result else election.eligible_voters.filter(has_voted=True).count()
        turnout_pct = round((total_voted / total_eligible * 100), 2) if total_eligible > 0 else 0.0

        format_type = request.query_params.get('format', 'csv').lower()

        if format_type == 'pdf':
            # Generate printable HTML / PDF-ready report
            html_rows = ""
            if result:
                candidate_results = result.candidate_results.all().order_by('-vote_count')
                for rank, cr in enumerate(candidate_results, 1):
                    pct = round((cr.vote_count / total_voted * 100), 2) if total_voted > 0 else 0.0
                    html_rows += f"""
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: center; font-weight: bold;">#{rank}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;"><strong>{cr.candidate.full_name}</strong></td>
                      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;">{cr.candidate.party_or_affiliation or 'Independent'}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right;">{cr.vote_count:,}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right; font-weight: bold; color: #1e40af;">{pct}%</td>
                    </tr>
                    """

            html_content = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>DigiVote Official Election Report - {election.title}</title>
              <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; }}
                .header {{ border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }}
                h1 {{ color: #1e40af; margin: 0 0 6px 0; font-size: 26px; }}
                .subtitle {{ color: #64748b; margin: 0; font-size: 14px; }}
                .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }}
                .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }}
                .card-title {{ font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }}
                .card-value {{ font-size: 22px; font-weight: bold; color: #0f172a; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 30px; }}
                th {{ background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; color: #334155; }}
                .footer {{ border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }}
                @media print {{
                  body {{ margin: 20px; }}
                  .no-print {{ display: none; }}
                }}
              </style>
            </head>
            <body>
              <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="background: #1e40af; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                  Print / Save to PDF
                </button>
              </div>

              <div class="header">
                <h1>🗳️ DigiVote Official Certified Election Report</h1>
                <p class="subtitle">Platform-Certified Cryptographic Voting Audit & Turnout Report</p>
              </div>

              <div class="grid">
                <div class="card">
                  <div class="card-title">Election Name</div>
                  <div class="card-value" style="font-size: 18px;">{election.title}</div>
                  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Type: {election.election_type.title()} &bull; Status: {election.status.upper()}</div>
                </div>
                <div class="card">
                  <div class="card-title">Voter Turnout Rate</div>
                  <div class="card-value" style="color: #1e40af;">{turnout_pct}%</div>
                  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">{total_voted:,} ballots cast out of {total_eligible:,} registered voters</div>
                </div>
              </div>

              <h2 style="font-size: 18px; margin-bottom: 8px;">Official Candidate Standings & Vote Distribution</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 70px; text-align: center;">Rank</th>
                    <th>Candidate</th>
                    <th>Affiliation / Party</th>
                    <th style="text-align: right; width: 130px;">Votes Count</th>
                    <th style="text-align: right; width: 120px;">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {html_rows}
                </tbody>
              </table>

              <div class="footer">
                <div>Generated: {timezone.now().strftime('%B %d, %Y, %H:%M:%S UTC')}</div>
                <div>Cryptographic Tally Integrity: <strong>{"VERIFIED & CERTIFIED" if (result and result.integrity_verified) else "PENDING"}</strong></div>
              </div>
            </body>
            </html>
            """
            return HttpResponse(html_content, content_type='text/html')

        # CSV Export
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="election_report_{election.id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Election Title', election.title])
        writer.writerow(['Election Type', election.election_type])
        writer.writerow(['Status', election.status])
        writer.writerow(['Start Datetime', election.start_datetime or ''])
        writer.writerow(['End Datetime', election.end_datetime or ''])
        writer.writerow(['Total Registered Voters', total_eligible])
        writer.writerow(['Total Ballots Cast', total_voted])
        writer.writerow(['Turnout Percentage', f"{turnout_pct}%"])
        writer.writerow([])
        writer.writerow(['Rank', 'Candidate Name', 'Party / Affiliation', 'Vote Count', 'Percentage'])

        if result:
            candidate_results = result.candidate_results.all().order_by('-vote_count')
            for rank, cr in enumerate(candidate_results, 1):
                pct = round((cr.vote_count / total_voted * 100), 2) if total_voted > 0 else 0.0
                writer.writerow([
                    f"#{rank}",
                    cr.candidate.full_name,
                    cr.candidate.party_or_affiliation or 'Independent',
                    cr.vote_count,
                    f"{pct}%"
                ])

        return response
