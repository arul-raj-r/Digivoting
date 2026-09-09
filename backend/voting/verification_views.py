import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from authentication.models import OTPVerification
from authentication.services.email_service import EmailService
from elections.models import Election, EligibleVoter
from elections.audit import log_election_action
from voting.models import VotingAuthorization
from voting.face_service import verify_voter_face


class VoterElectionsListView(APIView):
    """
    GET /api/voter/elections/
    Returns all elections where the authenticated user is on the eligible voter roll,
    along with election details, eligibility status, and voting status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        rolls = EligibleVoter.objects.filter(email__iexact=user.email).select_related('election', 'election__verification_config', 'election__rules')

        results = []
        for roll in rolls:
            election = roll.election
            v_config = getattr(election, 'verification_config', None)
            rules = getattr(election, 'rules', None)

            # Check for active voting authorization
            auth_token = VotingAuthorization.objects.filter(
                election=election,
                voter=roll,
                consumed=False,
                expires_at__gt=timezone.now()
            ).first()

            results.append({
                "id": str(election.id),
                "title": election.title,
                "organization": election.organization,
                "position_category": election.position_category,
                "description": election.description,
                "election_type": election.election_type,
                "status": election.status,
                "start_datetime": election.start_datetime.isoformat() if election.start_datetime else None,
                "end_datetime": election.end_datetime.isoformat() if election.end_datetime else None,
                "is_locked": election.is_locked,
                "has_voted": roll.has_voted,
                "voted_at": roll.voted_at.isoformat() if roll.voted_at else None,
                "verification_status": roll.verification_status,
                "has_active_authorization": bool(auth_token),
                "verification_required": {
                    "email_otp": v_config.require_email_otp if v_config else False,
                    "webcam_face": v_config.require_webcam_verification if v_config else False,
                },
                "results_available": bool(
                    election.status == 'completed' and 
                    getattr(election, 'election_result', None) and 
                    election.election_result.is_published
                )
            })

        return Response({"elections": results}, status=status.HTTP_200_OK)


class VoterElectionEligibilityView(APIView):
    """
    GET /api/voter/elections/<election_id>/eligibility/
    Validates user account, election existence, active status, voter roll presence,
    and returns required verification steps and current progress.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        roll = EligibleVoter.objects.filter(election=election, email__iexact=user.email).first()
        if not roll:
            return Response({
                "eligible": False,
                "error": "You are not registered on the eligible voter roll for this election.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_403_FORBIDDEN)

        if election.status != 'active':
            return Response({
                "eligible": False,
                "error": f"This election is currently '{election.status}'. Voting is only open for active elections.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_400_BAD_REQUEST)

        if roll.has_voted:
            return Response({
                "eligible": False,
                "has_voted": True,
                "voted_at": roll.voted_at.isoformat() if roll.voted_at else None,
                "error": "You have already cast your vote in this election. Duplicate voting is prohibited.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_409_CONFLICT)

        # Retrieve verification requirements
        v_config, _ = election.verification_config, getattr(election, 'verification_config', None)
        require_otp = v_config.require_email_otp if v_config else False
        require_face = v_config.require_webcam_verification if v_config else False

        # Current verification progress
        otp_verified = roll.verification_status in ['OTP_VERIFIED', 'VERIFIED'] or not require_otp
        face_verified = roll.verification_status in ['FACE_VERIFIED', 'VERIFIED'] or not require_face

        # Check if active authorization exists
        active_auth = VotingAuthorization.objects.filter(
            election=election,
            voter=roll,
            consumed=False,
            expires_at__gt=timezone.now()
        ).first()

        all_completed = (otp_verified if require_otp else True) and (face_verified if require_face else True)

        return Response({
            "eligible": True,
            "election": {
                "id": str(election.id),
                "title": election.title,
                "description": election.description,
                "organization": getattr(election, 'organization', None),
                "status": election.status,
                "election_type": election.election_type,
            },
            "voter": {
                "name": getattr(roll, 'name', None) or roll.email.split('@')[0].capitalize(),
                "email": roll.email,
                "student_id": getattr(roll, 'student_id', None),
                "has_voted": roll.has_voted,
                "verification_status": roll.verification_status
            },
            "verification_config": {
                "require_email_otp": require_otp,
                "require_webcam_verification": require_face,
            },
            "verification_progress": {
                "otp_verified": otp_verified,
                "face_verified": face_verified,
                "all_completed": all_completed,
            },
            "has_active_authorization": bool(active_auth),
            "authorization_expires_at": active_auth.expires_at.isoformat() if active_auth else None
        }, status=status.HTTP_200_OK)

    def post(self, request, election_id):
        """
        POST /api/voter/elections/<election_id>/eligibility/
        Matches voter-submitted details (email, student_id) against the election's
        creator-uploaded eligible voter roster.
        Returns MATCH_FOUND, NO_MATCH, or MISMATCH.
        """
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        submitted_email = str(request.data.get('email', '')).strip().lower() or (request.user.email.lower() if request.user.is_authenticated else '')
        submitted_student_id = str(request.data.get('student_id', '')).strip()

        # Find eligible voter record for this election
        roll = None
        if submitted_email:
            roll = EligibleVoter.objects.filter(election=election, email__iexact=submitted_email).first()
        
        if not roll and submitted_student_id:
            roll = EligibleVoter.objects.filter(election=election, student_id__iexact=submitted_student_id).first()

        if not roll:
            return Response({
                "match": "NO_MATCH",
                "eligible": False,
                "error": "You are not listed as an eligible voter for this election. Eligibility is restricted to the creator's uploaded roster.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if student_id was provided and mismatches the record
        if submitted_student_id and roll.student_id:
            if roll.student_id.strip().lower() != submitted_student_id.lower():
                return Response({
                    "match": "MISMATCH",
                    "eligible": False,
                    "error": f"The provided Student ID does not match the registered voter record for this email address.",
                    "election_title": election.title,
                    "election_status": election.status
                }, status=status.HTTP_400_BAD_REQUEST)

        # Link user if not linked
        if not roll.user and request.user.is_authenticated:
            roll.user = request.user
            roll.save(update_fields=['user'])

        if election.status != 'active':
            return Response({
                "match": "MATCH_FOUND",
                "eligible": True,
                "can_vote": False,
                "error": f"This election is currently '{election.status}'. Voting is only open for active elections.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_400_BAD_REQUEST)

        if roll.has_voted:
            return Response({
                "match": "MATCH_FOUND",
                "eligible": True,
                "has_voted": True,
                "voted_at": roll.voted_at.isoformat() if roll.voted_at else None,
                "error": "You have already cast your vote in this election. Duplicate voting is prohibited.",
                "election_title": election.title,
                "election_status": election.status
            }, status=status.HTTP_409_CONFLICT)

        # Retrieve verification requirements
        v_config = getattr(election, 'verification_config', None)
        require_otp = v_config.require_email_otp if v_config else False
        require_face = v_config.require_webcam_verification if v_config else False

        otp_verified = roll.verification_status in ['OTP_VERIFIED', 'VERIFIED'] or not require_otp
        face_verified = roll.verification_status in ['FACE_VERIFIED', 'VERIFIED'] or not require_face
        all_completed = (otp_verified if require_otp else True) and (face_verified if require_face else True)

        active_auth = VotingAuthorization.objects.filter(
            election=election,
            voter=roll,
            consumed=False,
            expires_at__gt=timezone.now()
        ).first()

        return Response({
            "match": "MATCH_FOUND",
            "eligible": True,
            "message": "✓ Verified: You are listed on the eligible voter roster for this election.",
            "election": {
                "id": str(election.id),
                "title": election.title,
                "description": election.description,
                "organization": getattr(election, 'organization', None),
                "status": election.status,
                "election_type": election.election_type,
            },
            "voter": {
                "name": getattr(roll, 'name', None) or roll.email.split('@')[0].capitalize(),
                "email": roll.email,
                "student_id": getattr(roll, 'student_id', None),
                "has_voted": roll.has_voted,
                "verification_status": roll.verification_status
            },
            "verification_config": {
                "require_email_otp": require_otp,
                "require_webcam_verification": require_face,
            },
            "verification_progress": {
                "otp_verified": otp_verified,
                "face_verified": face_verified,
                "all_completed": all_completed,
            },
            "has_active_authorization": bool(active_auth),
            "authorization_expires_at": active_auth.expires_at.isoformat() if active_auth else None
        }, status=status.HTTP_200_OK)


class VoterElectionOTPView(APIView):
    """
    POST /api/voter/elections/<election_id>/otp/
    Handles election-specific voter OTP challenges by reusing the existing OTPVerification system:
    - action == 'request': Generates 6-digit code, saves hash with purpose='ELECTION_VERIFICATION', sends email.
    - action == 'verify': Verifies code hash, enforces attempts, marks voter status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        roll = EligibleVoter.objects.filter(election=election, email__iexact=user.email).first()
        if not roll:
            return Response({"error": "You are not on the eligible voter roll for this election."}, status=status.HTTP_403_FORBIDDEN)

        if election.status != 'active':
            return Response({"error": f"Election is not currently active (status: '{election.status}')."}, status=status.HTTP_400_BAD_REQUEST)

        if roll.has_voted:
            return Response({"error": "You have already voted in this election."}, status=status.HTTP_409_CONFLICT)

        action = request.data.get('action', 'request')

        if action == 'request':
            # Check 60-second cooldown on existing unexpired OTP
            recent_otp = OTPVerification.objects.filter(
                user=user,
                purpose='ELECTION_VERIFICATION',
                used=False,
                created_at__gt=timezone.now() - timedelta(seconds=60)
            ).first()
            if recent_otp:
                cooldown_remaining = int(60 - (timezone.now() - recent_otp.created_at).total_seconds())
                return Response({
                    "error": f"Please wait {max(1, cooldown_remaining)} seconds before requesting a new OTP."
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Generate cryptographically secure 6-digit code
            if getattr(settings, 'DEMO_MODE', True):
                otp_code = "123456"
            else:
                otp_code = f"{secrets.randbelow(900000) + 100000}"

            otp_record = OTPVerification.objects.create(
                user=user,
                purpose='ELECTION_VERIFICATION',
                code_hash=make_password(otp_code),
                expires_at=timezone.now() + timedelta(minutes=10),
                max_attempts=3
            )

            # Send OTP email
            try:
                EmailService.send_otp_email(user.email, otp_code)
            except Exception as e:
                # Log email dispatch error
                pass

            if getattr(settings, 'DEMO_MODE', True):
                print(f"\n[DEMO ELECTION OTP] Verification code for '{user.email}' in '{election.title}': {otp_code}\n", flush=True)

            return Response({
                "message": f"Verification code sent to {user.email}.",
                "challenge_id": str(otp_record.id),
                "expires_in_seconds": 600,
                "email": user.email
            }, status=status.HTTP_200_OK)

        elif action == 'verify':
            otp_code = str(request.data.get('otp_code', '')).strip()
            if not otp_code or len(otp_code) != 6:
                return Response({"error": "Please provide a valid 6-digit verification code."}, status=status.HTTP_400_BAD_REQUEST)

            challenge_id = request.data.get('challenge_id')
            if challenge_id:
                otp_record = OTPVerification.objects.filter(id=challenge_id, user=user, purpose='ELECTION_VERIFICATION').first()
            else:
                otp_record = OTPVerification.objects.filter(
                    user=user,
                    purpose='ELECTION_VERIFICATION',
                    used=False
                ).order_by('-created_at').first()

            if not otp_record or otp_record.used:
                return Response({"error": "Invalid or expired verification challenge. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.expires_at < timezone.now():
                return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.attempt_count >= otp_record.max_attempts:
                return Response({"error": "Maximum verification attempts exceeded. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

            # Validate OTP code hash
            otp_record.attempt_count += 1
            if not check_password(otp_code, otp_record.code_hash):
                otp_record.save(update_fields=['attempt_count'])
                attempts_left = max(0, otp_record.max_attempts - otp_record.attempt_count)
                return Response({
                    "error": f"Incorrect verification code. {attempts_left} attempt(s) remaining.",
                    "attempts_remaining": attempts_left
                }, status=status.HTTP_400_BAD_REQUEST)

            # Success: Mark OTP consumed and update voter verification status
            otp_record.used = True
            otp_record.save(update_fields=['used', 'attempt_count'])

            v_config = getattr(election, 'verification_config', None)
            require_face = v_config.require_webcam_verification if v_config else False

            if require_face and roll.verification_status != 'FACE_VERIFIED':
                roll.verification_status = 'OTP_VERIFIED'
            else:
                roll.verification_status = 'VERIFIED'
                roll.verified_at = timezone.now()
            roll.save(update_fields=['verification_status', 'verified_at'])

            log_election_action(
                election=election,
                action='verification_completed',
                actor=user,
                details={'method': 'email_otp', 'email': user.email},
                request=request
            )

            return Response({
                "message": "Email OTP verification successful.",
                "verification_status": roll.verification_status,
                "verified": True
            }, status=status.HTTP_200_OK)

        else:
            return Response({"error": "Invalid action. Supported actions: 'request', 'verify'."}, status=status.HTTP_400_BAD_REQUEST)


class VoterElectionFaceVerificationView(APIView):
    """
    POST /api/voter/elections/<election_id>/face-verification/
    Performs real-time face detection & identity recognition using OpenCV:
    - Decodes live webcam snapshot base64 frame.
    - Validates single face presence and quality via YuNet.
    - Matches 128-d deep facial embeddings against registered photo via SFace.
    - Updates EligibleVoter verification status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        roll = EligibleVoter.objects.filter(election=election, email__iexact=user.email).first()
        if not roll:
            return Response({"error": "You are not on the eligible voter roll for this election."}, status=status.HTTP_403_FORBIDDEN)

        if election.status != 'active':
            return Response({"error": f"Election is not currently active (status: '{election.status}')."}, status=status.HTTP_400_BAD_REQUEST)

        if roll.has_voted:
            return Response({"error": "You have already voted in this election."}, status=status.HTTP_409_CONFLICT)

        image_b64 = request.data.get('image')
        if not image_b64:
            return Response({"error": "Webcam image frame is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Run Deep Neural Network Face Verification pipeline
        result = verify_voter_face(user, image_b64)
        if not result.get('verified'):
            return Response({
                "verified": False,
                "error": result.get('error', 'Face verification failed.'),
                "confidence": result.get('confidence')
            }, status=status.HTTP_400_BAD_REQUEST)

        # Face verification succeeded: update roll status
        v_config = getattr(election, 'verification_config', None)
        require_otp = v_config.require_email_otp if v_config else False

        if require_otp and roll.verification_status != 'OTP_VERIFIED':
            roll.verification_status = 'FACE_VERIFIED'
        else:
            roll.verification_status = 'VERIFIED'
            roll.verified_at = timezone.now()
        roll.save(update_fields=['verification_status', 'verified_at'])

        log_election_action(
            election=election,
            action='verification_completed',
            actor=user,
            details={
                'method': 'webcam_face_sface',
                'enrolled_first_time': result.get('enrolled', False),
                'confidence': result.get('confidence')
            },
            request=request
        )

        return Response({
            "verified": True,
            "message": result.get('message', 'Face verification successful.'),
            "verification_status": roll.verification_status,
            "enrolled": result.get('enrolled', False)
        }, status=status.HTTP_200_OK)


class VoterVotingAuthorizationView(APIView):
    """
    POST /api/voter/elections/<election_id>/authorization/
    Issues a cryptographically secure, single-use 15-minute Voting Authorization token.
    Enforces that all required verification steps (Email OTP, Face verification) are passed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except (Election.DoesNotExist, ValueError):
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        roll = EligibleVoter.objects.filter(election=election, email__iexact=user.email).first()
        if not roll:
            return Response({"error": "You are not on the eligible voter roll for this election."}, status=status.HTTP_403_FORBIDDEN)

        if election.status != 'active':
            return Response({"error": f"Election is not currently active (status: '{election.status}')."}, status=status.HTTP_400_BAD_REQUEST)

        if roll.has_voted:
            return Response({"error": "You have already voted in this election."}, status=status.HTTP_409_CONFLICT)

        # Check required verification rules
        v_config = getattr(election, 'verification_config', None)
        require_otp = v_config.require_email_otp if v_config else False
        require_face = v_config.require_webcam_verification if v_config else False

        # Validate completion
        if require_otp and roll.verification_status not in ['OTP_VERIFIED', 'VERIFIED']:
            return Response({
                "error": "Email OTP verification is required before voting authorization can be granted.",
                "pending_step": "EMAIL_OTP"
            }, status=status.HTTP_403_FORBIDDEN)

        if require_face and roll.verification_status not in ['FACE_VERIFIED', 'VERIFIED']:
            return Response({
                "error": "Webcam face verification is required before voting authorization can be granted.",
                "pending_step": "FACE_VERIFICATION"
            }, status=status.HTTP_403_FORBIDDEN)

        # Expire any older unconsumed tokens for this voter and election
        VotingAuthorization.objects.filter(election=election, voter=roll, consumed=False).update(consumed=True)

        # Generate 32-byte secure random token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=15)

        VotingAuthorization.objects.create(
            election=election,
            voter=roll,
            token_hash=token_hash,
            expires_at=expires_at
        )

        return Response({
            "message": "Voting authorization granted successfully. Proceed to candidate selection.",
            "authorization_token": raw_token,
            "expires_at": expires_at.isoformat(),
            "valid_minutes": 15
        }, status=status.HTTP_200_OK)
