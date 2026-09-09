import random
import hashlib
from django.db import models, transaction, IntegrityError
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from authentication.models import User
from authentication.permissions import IsAdmin, IsVoter
from authentication.utils import log_event
from audit.models import AuditLog
from voters.models import VoterProfile, Constituency
from elections.models import (
    Election,
    EligibleVoter,
    Candidate as ElectionCandidateModel,
    ElectionVerificationConfig,
    ElectionRules,
    ElectionAuditLog
)
from candidates.models import Candidate, ElectionCandidate, PoliticalParty
from voting.models import VoteReceipt, Vote, VoteTransaction
from elections.serializers import (
    ElectionSerializer,
    ElectionCreateSerializer,
    ElectionUpdateSerializer,
    ElectionCandidateSerializer,
    CandidateSerializer,
    EligibleVoterSerializer,
    EligibleVoterCreateSerializer,
    CandidateModelSerializer,
    CandidateReorderSerializer,
    ElectionVerificationConfigSerializer,
    ElectionRulesSerializer,
    ElectionStartSerializer,
    ElectionStopSerializer,
    ElectionAuditLogSerializer,
    ElectionMonitoringSerializer
)
from elections.permissions import (
    CanManageElections,
    IsElectionCreator,
    check_election_configuration_unlocked,
    check_election_rescheduling_allowed
)
from elections.audit import log_election_action


class ElectionListCreateView(APIView):
    """
    Module 8: Election Creation and Creator Election Listing.
    POST /api/elections/: Create a new election with status='draft', created_by=request.user.
    GET /api/elections/: List elections created by requesting user (or all if staff/admin).
    """
    permission_classes = [CanManageElections]

    def get(self, request):
        user = request.user
        if user.is_staff or user.is_superuser or user.role == User.ADMIN:
            queryset = Election.objects.all().order_by('-created_at')
        else:
            queryset = Election.objects.filter(created_by=user).order_by('-created_at')
        
        serializer = ElectionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ElectionCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        election = serializer.save()
        log_election_action(
            election=election,
            action='created',
            actor=request.user,
            details={'title': election.title, 'election_type': election.election_type},
            request=request
        )
        return Response(ElectionSerializer(election).data, status=status.HTTP_201_CREATED)


class ElectionDetailView(APIView):
    """
    Module 8: Election Detail, Edit, and Delete endpoints.
    GET /api/elections/<id>/: View election (Creator or Platform Admin only).
    PATCH /api/elections/<id>/: Edit election details (Creator only).
        - In 'draft' or 'configured': Can edit title, description, election_type, dates, status.
        - In 'scheduled': Can reschedule (edit start_datetime and end_datetime). Non-date changes rejected.
        - Once 'active', 'completed', or 'cancelled', or if is_locked: Fully locked.
    DELETE /api/elections/<id>/: Delete election (Creator only, status=='draft' only).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return None

    def get(self, request, pk):
        election = self.get_object(pk)
        if not election:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Only the creator or a platform admin/staff can view it prior to publishing
        if not (election.created_by == user or user.is_staff or user.is_superuser or user.role == User.ADMIN):
            return Response({"error": "You do not have permission to view this election."}, status=status.HTTP_403_FORBIDDEN)

        return Response(ElectionSerializer(election).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        election = self.get_object(pk)
        if not election:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Only creator can edit (or superuser)
        if election.created_by != user and not (user.is_staff or user.is_superuser):
            return Response({"error": "Only the creator of this election can edit it."}, status=status.HTTP_403_FORBIDDEN)

        # Check overall lock
        if election.is_locked or election.status in ['active', 'completed', 'cancelled']:
            return Response(
                {"error": f"Election cannot be edited because its status is '{election.status}' or it is locked."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Core details (title, description, election_type) can only be edited while status='draft'
        core_keys = set(request.data.keys()) & {'title', 'description', 'election_type'}
        if core_keys and election.status != 'draft':
            return Response(
                {"error": f"Core details ({', '.join(core_keys)}) can only be edited while election is in draft status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If election is already scheduled, only date modifications (rescheduling) or status are permitted
        if election.status == 'scheduled':
            disallowed_keys = set(request.data.keys()) - {'start_datetime', 'end_datetime', 'status'}
            if disallowed_keys:
                return Response(
                    {"error": f"Cannot edit {', '.join(disallowed_keys)} while election is scheduled. Only rescheduling (start_datetime, end_datetime) is allowed."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = ElectionUpdateSerializer(election, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_election = serializer.save()

        # Determine specific audit action
        if 'status' in request.data and request.data['status'] != election.status:
            action_type = 'status_changed'
            details = {'from': election.status, 'to': updated_election.status}
        else:
            action_type = 'created' if election.status == 'draft' else 'status_changed'
            details = {'updated_fields': list(request.data.keys())}

        log_election_action(
            election=updated_election,
            action=action_type,
            actor=request.user,
            details=details,
            request=request
        )
        return Response(ElectionSerializer(updated_election).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        election = self.get_object(pk)
        if not election:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Only creator can delete
        if election.created_by != user and not (user.is_staff or user.is_superuser):
            return Response({"error": "Only the creator of this election can delete it."}, status=status.HTTP_403_FORBIDDEN)

        # Enforce draft status check: Deleting a non-draft election is rejected
        if election.status != 'draft':
            return Response(
                {"error": f"Election cannot be deleted because its status is '{election.status}'. Only draft elections can be deleted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        election_id = str(election.id)
        title = election.title
        election.delete()

        log_event(
            request.user,
            'ELECTION_DELETE',
            request,
            {'election_id': election_id, 'title': title}
        )
        return Response({"message": "Election deleted successfully."}, status=status.HTTP_200_OK)


# ============================================================================
# MODULE 9: VOTER & CANDIDATE CONFIGURATION VIEWS
# ============================================================================

def get_election_for_creator_or_403(election_id, request_user):
    """
    Helper function to retrieve election and enforce creator/admin ownership.
    """
    try:
        election = Election.objects.get(pk=election_id)
    except (Election.DoesNotExist, ValueError):
        return None, Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

    if election.created_by != request_user and not (request_user.is_staff or request_user.is_superuser or request_user.role == User.ADMIN):
        return None, Response({"error": "You do not have permission to manage this election."}, status=status.HTTP_403_FORBIDDEN)

    return election, None


class EligibleVoterListCreateView(APIView):
    """
    Module 9: Voter Configuration List & Single Add.
    GET /api/elections/<election_id>/voters/ : List eligible voters with search/filter.
    POST /api/elections/<election_id>/voters/ : Add single eligible voter by email.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        queryset = election.eligible_voters.all().order_by('-added_at')
        
        # Search by email
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(email__icontains=search)

        # Filter by has_voted
        has_voted_param = request.query_params.get('has_voted')
        if has_voted_param is not None and has_voted_param != '':
            if has_voted_param.lower() == 'true':
                queryset = queryset.filter(has_voted=True)
            elif has_voted_param.lower() == 'false':
                queryset = queryset.filter(has_voted=False)

        serializer = EligibleVoterSerializer(queryset, many=True)
        return Response({
            "count": queryset.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot add voters: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EligibleVoterCreateSerializer(data=request.data, context={'election': election})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        name = serializer.validated_data.get('name')
        student_id = serializer.validated_data.get('student_id')
        mobile_number = serializer.validated_data.get('mobile_number')
        matched_user = User.objects.filter(email=email).first()

        voter = EligibleVoter.objects.create(
            election=election,
            email=email,
            name=name,
            student_id=student_id,
            mobile_number=mobile_number,
            user=matched_user,
            has_voted=False
        )

        log_election_action(
            election=election,
            action='voter_added',
            actor=request.user,
            details={'voter_id': str(voter.id), 'email': email, 'student_id': student_id},
            request=request
        )

        return Response(EligibleVoterSerializer(voter).data, status=status.HTTP_201_CREATED)


class EligibleVoterBulkUploadView(APIView):
    """
    Module 9: Bulk CSV Voter Roll Upload.
    POST /api/elections/<election_id>/voters/bulk-upload/
    Supports dry_run=true for validation preview before committing to database.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot upload voters: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({"error": "No CSV file uploaded. Please provide a file with key 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({"error": "Uploaded file must be a .csv file."}, status=status.HTTP_400_BAD_REQUEST)

        dry_run_param = request.data.get('dry_run') or request.query_params.get('dry_run', False)
        dry_run = str(dry_run_param).lower() in ['true', '1', 'yes']

        try:
            from elections.utils import parse_and_validate_voters_csv
            result = parse_and_validate_voters_csv(csv_file, election, dry_run=dry_run)
            
            if not dry_run:
                log_election_action(
                    election=election,
                    action='voter_added',
                    actor=request.user,
                    details={
                        'method': 'bulk_upload',
                        'success_count': result['success_count'],
                        'failed_count': result['failed_count'],
                        'skipped_count': result['skipped_count']
                    },
                    request=request
                )

            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"An error occurred while processing CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class EligibleVoterDetailView(APIView):
    """
    Module 9: Remove a single eligible voter from the roll.
    DELETE /api/elections/<election_id>/voters/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, election_id, pk):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot remove voters: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            voter = election.eligible_voters.get(pk=pk)
        except (EligibleVoter.DoesNotExist, ValueError):
            return Response({"error": "Eligible voter record not found in this election."}, status=status.HTTP_404_NOT_FOUND)

        voter_id = str(voter.id)
        email = voter.email
        voter.delete()

        log_election_action(
            election=election,
            action='voter_removed',
            actor=request.user,
            details={'voter_id': voter_id, 'email': email},
            request=request
        )

        return Response({"message": "Voter removed from election roll successfully."}, status=status.HTTP_200_OK)


class CandidateListCreateView(APIView):
    """
    Module 9: Candidate Roster List & Creation.
    GET /api/elections/<election_id>/candidates/ : List candidates ordered by display_order.
    POST /api/elections/<election_id>/candidates/ : Add a new candidate (multipart).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        candidates = election.candidates.all().order_by('display_order', 'added_at')
        serializer = CandidateModelSerializer(candidates, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot add candidates: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CandidateModelSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Set default next display_order if not provided
        highest_order = election.candidates.all().order_by('-display_order').values_list('display_order', flat=True).first()
        next_order = (highest_order + 1) if highest_order is not None else 0

        candidate = serializer.save(election=election, display_order=serializer.validated_data.get('display_order', next_order))

        log_election_action(
            election=election,
            action='candidate_added',
            actor=request.user,
            details={'candidate_id': str(candidate.id), 'name': candidate.full_name},
            request=request
        )

        return Response(CandidateModelSerializer(candidate, context={'request': request}).data, status=status.HTTP_201_CREATED)


class CandidateDetailView(APIView):
    """
    Module 9: Candidate Detail, Edit, and Delete.
    GET /api/elections/<election_id>/candidates/<pk>/
    PATCH /api/elections/<election_id>/candidates/<pk>/
    DELETE /api/elections/<election_id>/candidates/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id, pk):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        try:
            candidate = election.candidates.get(pk=pk)
        except (ElectionCandidateModel.DoesNotExist, ValueError):
            return Response({"error": "Candidate not found in this election."}, status=status.HTTP_404_NOT_FOUND)

        return Response(CandidateModelSerializer(candidate, context={'request': request}).data, status=status.HTTP_200_OK)

    def patch(self, request, election_id, pk):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot edit candidates: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            candidate = election.candidates.get(pk=pk)
        except (ElectionCandidateModel.DoesNotExist, ValueError):
            return Response({"error": "Candidate not found in this election."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CandidateModelSerializer(candidate, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_candidate = serializer.save()

        log_election_action(
            election=election,
            action='candidate_updated',
            actor=request.user,
            details={'candidate_id': str(updated_candidate.id), 'name': updated_candidate.full_name},
            request=request
        )

        return Response(CandidateModelSerializer(updated_candidate, context={'request': request}).data, status=status.HTTP_200_OK)

    def delete(self, request, election_id, pk):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot delete candidates: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            candidate = election.candidates.get(pk=pk)
        except (ElectionCandidateModel.DoesNotExist, ValueError):
            return Response({"error": "Candidate not found in this election."}, status=status.HTTP_404_NOT_FOUND)

        candidate_id = str(candidate.id)
        name = candidate.full_name
        candidate.delete()

        log_election_action(
            election=election,
            action='candidate_removed',
            actor=request.user,
            details={'candidate_id': candidate_id, 'name': name},
            request=request
        )

        return Response({"message": "Candidate removed from election successfully."}, status=status.HTTP_200_OK)


class CandidateReorderView(APIView):
    """
    Module 9: Atomic Candidate Ballot Reordering.
    POST /api/elections/<election_id>/candidates/reorder/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot reorder candidates: {error_msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CandidateReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        candidate_ids = serializer.validated_data['candidate_ids']

        # Ensure all IDs belong to this election
        existing_candidate_ids = set(str(cid) for cid in election.candidates.values_list('id', flat=True))
        supplied_ids_set = set(str(cid) for cid in candidate_ids)

        if supplied_ids_set != existing_candidate_ids:
            return Response(
                {"error": "Candidate ID list must match all candidates registered in this election exactly."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atomic transaction update
        with transaction.atomic():
            for order, candidate_id in enumerate(candidate_ids):
                election.candidates.filter(id=candidate_id).update(display_order=order)

        updated_candidates = election.candidates.all().order_by('display_order', 'added_at')
        
        log_election_action(
            election=election,
            action='candidate_updated',
            actor=request.user,
            details={'reordered_ids': [str(c) for c in candidate_ids]},
            request=request
        )

        return Response(CandidateModelSerializer(updated_candidates, many=True, context={'request': request}).data, status=status.HTTP_200_OK)


# ============================================================================
# MODULE 10: ELECTION-SPECIFIC VERIFICATION SETUP & RULES CONFIGURATION
# ============================================================================

class ElectionVerificationConfigView(APIView):
    """
    Module 10: Election-Specific Verification Setup Endpoint.
    GET /api/elections/<election_id>/verification-config/
    PATCH /api/elections/<election_id>/verification-config/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Ensure config exists (fallback if created before signal)
        config, _ = ElectionVerificationConfig.objects.get_or_create(election=election)
        serializer = ElectionVerificationConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot edit verification configuration because election status is '{election.status}'. Verification rules are locked once scheduled or active."},
                status=status.HTTP_400_BAD_REQUEST
            )

        config, _ = ElectionVerificationConfig.objects.get_or_create(election=election)
        serializer = ElectionVerificationConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_config = serializer.save()

        log_election_action(
            election=election,
            action='verification_config_changed',
            actor=request.user,
            details={
                'require_email_otp': updated_config.require_email_otp,
                'require_webcam_verification': updated_config.require_webcam_verification,
                'require_biometric_verification': updated_config.require_biometric_verification
            },
            request=request
        )

        return Response(ElectionVerificationConfigSerializer(updated_config).data, status=status.HTTP_200_OK)


class ElectionRulesView(APIView):
    """
    Module 10: Election Rules and Result Visibility Timing Endpoint.
    GET /api/elections/<election_id>/rules/
    PATCH /api/elections/<election_id>/rules/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        rules, _ = ElectionRules.objects.get_or_create(election=election)
        serializer = ElectionRulesSerializer(rules)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status & Lock Gate
        is_allowed, error_msg = check_election_configuration_unlocked(election)
        if not is_allowed:
            return Response(
                {"error": f"Cannot edit election rules because election status is '{election.status}'. Rules are locked once scheduled or active."},
                status=status.HTTP_400_BAD_REQUEST
            )

        rules, _ = ElectionRules.objects.get_or_create(election=election)
        serializer = ElectionRulesSerializer(rules, data=request.data, partial=True, context={'election': election})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_rules = serializer.save()

        log_election_action(
            election=election,
            action='rules_changed',
            actor=request.user,
            details={
                'results_visibility': updated_rules.results_visibility,
                'results_visible_at': str(updated_rules.results_visible_at) if updated_rules.results_visible_at else None,
                'allow_vote_change': updated_rules.allow_vote_change
            },
            request=request
        )

        return Response(ElectionRulesSerializer(updated_rules).data, status=status.HTTP_200_OK)



class VoterElectionsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Admin gets all elections directly
        if user.role == 'ADMIN':
            elections = Election.objects.all().order_by('-created_at')
            data = []
            for election in elections:
                info = ElectionSerializer(election).data
                info['is_eligible'] = True
                info['already_voted'] = False
                info['verification_status'] = 'verified'
                info['instructions'] = election.description or 'Administrative review mode.'
                data.append(info)
            return Response(data, status=status.HTTP_200_OK)
            
        # Look up eligible voter rolls matching user email or user foreign key
        eligible_rolls = EligibleVoter.objects.filter(
            models.Q(email__iexact=user.email) | models.Q(user=user)
        ).select_related('election')
        
        roll_map = {roll.election_id: roll for roll in eligible_rolls}
        
        # Show all non-draft elections so voters can see Available, Active, Scheduled, Completed
        elections = Election.objects.exclude(status='draft').order_by('-start_datetime')
            
        data = []
        for election in elections:
            roll = roll_map.get(election.id)
            election_info = ElectionSerializer(election).data
            election_info['is_eligible'] = bool(roll)
            election_info['already_voted'] = roll.has_voted if roll else False
            election_info['verification_status'] = roll.verification_status if roll else None
            election_info['instructions'] = election.description or 'Please review candidate profiles before submitting your ballot.'
            data.append(election_info)
            
        return Response(data, status=status.HTTP_200_OK)


class LegacyCandidateListView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        user = request.user
        election_id = request.query_params.get('election_id')
        
        # Return registered contesters mapped through ElectionCandidate relation
        query = ElectionCandidate.objects.filter(is_approved=True)
        if election_id:
            query = query.filter(election_id=election_id)
            
        # If user is voter, filter candidates to match voter constituency
        if user.role == 'VOTER':
            try:
                voter = user.voter_profile
                query = query.filter(constituency=voter.constituency)
            except VoterProfile.DoesNotExist:
                return Response(
                    {"error": "Voter profile required."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = ElectionCandidateSerializer(query, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Admin can add a candidate to an election
        election_id = request.data.get('election_id')
        candidate_id = request.data.get('candidate_id')
        constituency_id = request.data.get('constituency_id')

        if not all([election_id, candidate_id, constituency_id]):
            return Response(
                {"error": "election_id, candidate_id and constituency_id are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            election = Election.objects.get(pk=election_id)
            candidate = Candidate.objects.get(pk=candidate_id)
            constituency = Constituency.objects.get(pk=constituency_id)
        except (Election.DoesNotExist, Candidate.DoesNotExist, Constituency.DoesNotExist):
            return Response(
                {"error": "Electoral entities not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        elec_cand, created = ElectionCandidate.objects.get_or_create(
            election=election,
            candidate=candidate,
            constituency=constituency,
            defaults={'is_approved': True}
        )

        log_event(
            request.user,
            'CANDIDATE_CREATION',
            request,
            {'candidate_id': str(candidate.id), 'election_id': str(election.id)}
        )
        return Response(ElectionCandidateSerializer(elec_cand).data, status=status.HTTP_201_CREATED)


class LegacyCandidateDetailView(RetrieveUpdateDestroyAPIView):
    queryset = ElectionCandidate.objects.all()
    serializer_class = ElectionCandidateSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class ApproveCandidateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            cand = ElectionCandidate.objects.get(pk=pk)
        except ElectionCandidate.DoesNotExist:
            return Response(
                {"error": "Election candidate mapping not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        cand.is_approved = True
        cand.save()
        
        log_event(
            request.user,
            'CANDIDATE_APPROVAL',
            request,
            {'candidate_id': str(cand.candidate.id), 'election_candidate_id': str(cand.id)}
        )
        
        return Response(ElectionCandidateSerializer(cand).data, status=status.HTTP_200_OK)


class VoteCastView(APIView):
    permission_classes = [IsVoter]

    def post(self, request):
        candidate_id = request.data.get('candidate_id')
        election_id = request.data.get('election_id')
        
        if not candidate_id or not election_id:
            return Response(
                {"error": "Candidate ID and Election ID are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            election = Election.objects.get(pk=election_id)
            candidate = Candidate.objects.get(pk=candidate_id)
        except (Election.DoesNotExist, Candidate.DoesNotExist):
            return Response(
                {"error": "Electoral records not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # 1. Verify Voter Profile
        try:
            voter = request.user.voter_profile
        except VoterProfile.DoesNotExist:
            return Response(
                {"error": "Voter profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # 2. Check if verified
        if voter.verification_status != 'VERIFIED':
            return Response(
                {"error": "Your voter account has not been verified by an administrator. You cannot vote yet."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # 3. Check election status (canonical lowercase 'active')
        if election.status.lower() != 'active':
            return Response(
                {"error": f"Voting is not open for this election. Current status: {election.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 4. Check date bounds
        now = timezone.now()
        if now < election.start_datetime or now > election.end_datetime:
            return Response(
                {"error": "This election is either closed or has not started yet."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 5. Check constituency eligibility through ElectionCandidate mapping
        try:
            elec_cand = ElectionCandidate.objects.get(
                election=election,
                candidate=candidate,
                constituency=voter.constituency,
                is_approved=True
            )
        except ElectionCandidate.DoesNotExist:
            return Response(
                {"error": "This candidate is not contesting in your constituency for this election."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 7. Atomic transaction voting submission with concurrency retry
        max_retries = 5
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    # Re-verify inside atomic transaction to lock record
                    if VoteReceipt.objects.filter(voter=voter, election=election).exists():
                        return Response(
                            {"error": "Double voting detected. You have already cast a vote in this election."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                        
                    # Generate unique receipt string
                    salt = f"{voter.id}-{election.id}-{timezone.now().isoformat()}-{random.randint(100000, 999999)}"
                    receipt_hash = hashlib.sha256(salt.encode()).hexdigest().upper()
                    
                    # Record receipt (linked to Voter + Election, unique together ensures single vote)
                    receipt = VoteReceipt.objects.create(
                        election=election,
                        voter=voter,
                        receipt_number=receipt_hash
                    )
                    
                    # Record anonymous Vote (linked ONLY to election, candidate and constituency - completely detached from voter)
                    Vote.objects.create(
                        election=election,
                        constituency=voter.constituency,
                        candidate=candidate
                    )

                    # Record vote transaction audit hash
                    VoteTransaction.objects.create(
                        election=election,
                        transaction_hash=receipt_hash
                    )
                    
                    # Audit log - logs who voted in what election, but NEVER the candidate choice
                    log_event(
                        request.user,
                        'VOTE_CAST',
                        request,
                        {
                            'election_id': str(election.id),
                            'receipt_number': receipt_hash,
                            'constituency_id': str(voter.constituency.id)
                        }
                    )
                break
            except IntegrityError:
                return Response(
                    {"error": "Double voting detected. You have already cast a vote in this election."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                if "locked" in str(e).lower() and attempt < max_retries - 1:
                    import time
                    time.sleep(0.05 * (attempt + 1))
                    continue
                return Response(
                    {"error": f"An error occurred while recording your vote: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        return Response({
            "message": "Your vote has been cast successfully.",
            "receipt_number": receipt_hash,
            "timestamp": receipt.timestamp,
            "election_name": election.name
        }, status=status.HTTP_201_CREATED)


class ElectionResultsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            election = Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return Response(
                {"error": "Election not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        total_votes_cast = Vote.objects.filter(election=election).count()
        total_verified_voters = VoterProfile.objects.filter(verification_status='VERIFIED').count()
        
        turnout_percentage = 0.0
        if total_verified_voters > 0:
            turnout_percentage = round((total_votes_cast / total_verified_voters) * 100, 2)
            
        # Candidates standing
        elec_candidates = ElectionCandidate.objects.filter(election=election, is_approved=True)
        candidates_data = []
        for ec in elec_candidates:
            votes = Vote.objects.filter(election=election, candidate=ec.candidate).count()
            candidates_data.append({
                "id": str(ec.candidate.id),
                "name": ec.candidate.name,
                "party_name": ec.candidate.party.name,
                "constituency_name": ec.constituency.name,
                "votes": votes
            })
            
        # Sort candidates by votes descending
        candidates_data.sort(key=lambda x: x['votes'], reverse=True)
        
        # Constituency-wise breakdown
        constituency_data = []
        for constituency in Constituency.objects.all():
            registered = VoterProfile.objects.filter(constituency=constituency, verification_status='VERIFIED').count()
            votes_cast = Vote.objects.filter(election=election, constituency=constituency).count()
            
            c_turnout = 0.0
            if registered > 0:
                c_turnout = round((votes_cast / registered) * 100, 2)
                
            constituency_data.append({
                "constituency_name": constituency.name,
                "registered_voters": registered,
                "votes_cast": votes_cast,
                "turnout_percentage": c_turnout
            })
            
        return Response({
            "election_id": str(election.id),
            "election_name": election.name,
            "status": election.status,
            "total_votes": total_votes_cast,
            "total_voters": total_verified_voters,
            "turnout_percentage": turnout_percentage,
            "candidates": candidates_data,
            "constituency_turnout": constituency_data
        })


class AdminSummaryView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_voters = VoterProfile.objects.count()
        pending_voters = VoterProfile.objects.filter(verification_status='PENDING').count()
        active_elections = Election.objects.filter(status='ACTIVE').count()
        pending_candidates = ElectionCandidate.objects.filter(is_approved=False).count()
        
        # Recent audit logs
        recent_logs = AuditLog.objects.all().order_by('-created_at')[:15]
        logs_data = []
        for log in recent_logs:
            logs_data.append({
                "id": str(log.id),
                "email": log.user.email if log.user else "Anonymous",
                "event_type": log.event_type,
                "ip_address": log.ip_address,
                "timestamp": log.created_at,
                "metadata": log.metadata
            })
            
        return Response({
            "total_voters": total_voters,
            "pending_voters": pending_voters,
            "active_elections": active_elections,
            "pending_candidates": pending_candidates,
            "recent_logs": logs_data
        })


class ExportElectionResultsExcelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            election = Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return Response(
                {"error": "Election not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        from openpyxl import Workbook
        from django.http import HttpResponse
        
        wb = Workbook()
        
        # Sheet 1: Summary Info
        ws_summary = wb.active
        ws_summary.title = "Summary Metrics"
        
        ws_summary.append(["DigiVoting - Election Results Report"])
        ws_summary.append([])
        ws_summary.append(["Election ID", str(election.id)])
        ws_summary.append(["Election Name", election.name])
        ws_summary.append(["Current Status", election.status])
        ws_summary.append(["Start Date", election.start_datetime.strftime("%Y-%m-%d %H:%M:%S") if election.start_datetime else "N/A"])
        ws_summary.append(["End Date", election.end_datetime.strftime("%Y-%m-%d %H:%M:%S") if election.end_datetime else "N/A"])
        
        total_votes = Vote.objects.filter(election=election).count()
        total_voters = VoterProfile.objects.filter(verification_status='VERIFIED').count()
        turnout = (total_votes / total_voters * 100) if total_voters > 0 else 0.0
        
        ws_summary.append(["Total Verified Voters", total_voters])
        ws_summary.append(["Total Votes Cast", total_votes])
        ws_summary.append(["Turnout Rate", f"{turnout:.2f}%"])
        
        # Sheet 2: Candidate Standings
        ws_candidates = wb.create_sheet(title="Candidate Standings")
        ws_candidates.append(["Candidate ID", "Candidate Name", "Political Party", "Constituency", "Votes Received"])
        elec_candidates = ElectionCandidate.objects.filter(election=election, is_approved=True)
        for ec in elec_candidates:
            votes = Vote.objects.filter(election=election, candidate=ec.candidate).count()
            ws_candidates.append([str(ec.candidate.id), ec.candidate.name, ec.candidate.party.name, ec.constituency.name, votes])
            
        # Sheet 3: Constituency Turnout
        ws_constituencies = wb.create_sheet(title="Constituency Turnout")
        ws_constituencies.append(["Constituency Name", "Registered Voters", "Votes Cast", "Turnout Percentage"])
        for con in Constituency.objects.all():
            reg = VoterProfile.objects.filter(constituency=con, verification_status='VERIFIED').count()
            cast = Vote.objects.filter(election=election, constituency=con).count()
            c_pct = (cast / reg * 100) if reg > 0 else 0.0
            ws_constituencies.append([con.name, reg, cast, f"{c_pct:.2f}%"])
            
        # Adjust column widths for basic readability
        for ws in [ws_summary, ws_candidates, ws_constituencies]:
            for col in ws.columns:
                max_len = max(len(str(val or '')) for val in [cell.value for cell in col])
                col_letter = col[0].column_letter
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
                
        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="election_report_{election.name.replace(" ", "_")}.xlsx"'
        wb.save(response)
        return response


# ============================================================================
# MODULE 11: ELECTION START/STOP CONTROL, MONITORING & AUDIT LOGS
# ============================================================================

class ElectionStartView(APIView):
    """
    Module 11: Manual Election Start Control.
    POST /api/elections/<election_id>/start/
    - Owner-only (Creator or Admin).
    - Allowed only from status == 'scheduled'.
    - Defense-in-depth runs FIRST: Rejects if eligible_voters or candidates count == 0.
    - Early start check runs SECOND: If now < start_datetime, requires force=True.
    - Sets status = 'active', is_locked = True, actual_start_at = now.
    - Logs 'started' audit event with metadata.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status check
        if election.status != 'scheduled':
            return Response(
                {"error": f"Cannot start election. Only 'scheduled' elections can be started (current status: '{election.status}')."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. DEFENSE-IN-DEPTH CHECK STRICTLY FIRST (regardless of force param)
        voter_count = election.eligible_voters.count()
        candidate_count = election.candidates.count()

        if voter_count == 0 and candidate_count == 0:
            return Response(
                {"error": "Cannot start election. You must configure at least one eligible voter and at least one candidate before starting."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if voter_count == 0:
            return Response(
                {"error": "Cannot start election. No eligible voters are registered in the election roll."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if candidate_count == 0:
            return Response(
                {"error": "Cannot start election. No candidates are registered in the candidate roster."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. EARLY START CHECK SECOND
        serializer = ElectionStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        force = serializer.validated_data.get('force', False)
        now = timezone.now()
        is_early = bool(election.start_datetime and now < election.start_datetime)

        if is_early and not force:
            return Response(
                {
                    "error": (
                        f"Election is scheduled to start at {election.start_datetime.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
                        "To start early and deviate from the published schedule, set force=true."
                    ),
                    "is_early": True,
                    "scheduled_start": election.start_datetime.isoformat()
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Transition to active & permanently lock configuration
        with transaction.atomic():
            election.status = 'active'
            election.is_locked = True
            election.actual_start_at = now
            election.save()

            log_election_action(
                election=election,
                action='started',
                actor=request.user,
                details={
                    'early_start': is_early,
                    'scheduled_start': election.start_datetime.isoformat() if election.start_datetime else None,
                    'actual_start_at': now.isoformat(),
                    'forced': force,
                    'voter_count': voter_count,
                    'candidate_count': candidate_count
                },
                request=request
            )

        return Response({
            "message": "Election started successfully and is now active. Configuration is permanently locked.",
            "election": ElectionSerializer(election).data
        }, status=status.HTTP_200_OK)


class ElectionStopView(APIView):
    """
    Module 11: Emergency Stop Control.
    POST /api/elections/<election_id>/stop/
    - Owner-only (Creator or Admin).
    - Allowed only from status == 'active'.
    - Requires reason (min 20 chars).
    - Sets status = 'cancelled', stopped_at = now, stop_reason = reason, stopped_by = request.user.
    - Strictly irreversible (no resume endpoint exists).
    - Logs 'stopped' audit event.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        # Status check - cannot stop already completed or cancelled elections
        if election.status in ['completed', 'cancelled']:
            return Response(
                {"error": f"Cannot stop election. Election is already '{election.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ElectionStopSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data['reason']
        now = timezone.now()

        with transaction.atomic():
            election.status = 'cancelled'
            election.stopped_at = now
            election.stop_reason = reason
            election.stopped_by = request.user
            election.save()

            log_election_action(
                election=election,
                action='stopped',
                actor=request.user,
                details={
                    'stopped_at': now.isoformat(),
                    'reason': reason,
                    'stopped_by_email': request.user.email
                },
                request=request
            )

        return Response({
            "message": "Election has been emergency stopped and marked as cancelled. This action is final.",
            "election": ElectionSerializer(election).data
        }, status=status.HTTP_200_OK)


class ElectionPauseView(APIView):
    """
    POST /api/elections/<election_id>/pause/
    - Owner-only (Creator or Admin).
    - Allowed only from status == 'active'.
    - Temporarily suspends voting.
    - Logs 'paused' audit event.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        if election.status != 'active':
            return Response(
                {"error": f"Cannot pause election. Only 'active' elections can be paused (current status: '{election.status}')."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            election.status = 'paused'
            election.save()

            log_election_action(
                election=election,
                action='paused',
                actor=request.user,
                details={'paused_at': timezone.now().isoformat()},
                request=request
            )

        return Response({
            "message": "Election has been paused. Voting is temporarily suspended.",
            "election": ElectionSerializer(election).data
        }, status=status.HTTP_200_OK)


class ElectionResumeView(APIView):
    """
    POST /api/elections/<election_id>/resume/
    - Owner-only (Creator or Admin).
    - Allowed only from status == 'paused'.
    - Resumes active voting.
    - Logs 'resumed' audit event.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        if election.status != 'paused':
            return Response(
                {"error": f"Cannot resume election with status '{election.status}'. Only paused elections can be resumed."},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            election.status = 'active'
            election.save()

            log_election_action(
                election=election,
                action='resumed',
                actor=request.user,
                details={'resumed_at': timezone.now().isoformat()},
                request=request
            )

        return Response({
            "message": "Election has been resumed and is now active. Voting is reopened.",
            "election": ElectionSerializer(election).data
        }, status=status.HTTP_200_OK)


class ElectionCompleteView(APIView):
    """
    POST /api/elections/<election_id>/complete/
    - Owner-only (Creator or Admin).
    - Allowed from status == 'active' or 'paused'.
    - Officially closes election and locks voting permanently.
    - Automatically executes cryptographic vote tally computation.
    - Logs 'completed' audit event.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        if election.status not in ['active', 'paused']:
            return Response(
                {"error": f"Cannot complete election. Only 'active' or 'paused' elections can be completed (current status: '{election.status}')."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            election.status = 'completed'
            election.save()

            log_election_action(
                election=election,
                action='completed',
                actor=request.user,
                details={'completed_at': timezone.now().isoformat()},
                request=request
            )

        # Trigger automatic cryptographic tally computation
        from voting.tally import compute_election_tally
        tally_result = compute_election_tally(election, force=True)

        return Response({
            "message": "Election has been officially completed. Vote tally computed successfully.",
            "tally_summary": tally_result,
            "election": ElectionSerializer(election).data
        }, status=status.HTTP_200_OK)


class ElectionAuditLogListView(APIView):
    """
    Module 11: Election Audit Trail Endpoint.
    GET /api/elections/<election_id>/audit-logs/
    - Owner-only (Creator or Admin).
    - Filterable by action type and date range.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        queryset = election.audit_logs.all().order_by('-created_at')

        # Filter by action type
        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        # Filter by date range
        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        serializer = ElectionAuditLogSerializer(queryset, many=True)
        return Response({
            "count": queryset.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class ElectionMonitoringView(APIView):
    """
    Module 11: Real-time Election Turnout & Monitoring Endpoint.
    GET /api/elections/<election_id>/monitoring/
    - Owner-only (Creator or Admin).
    - Aggregate turnout statistics (total voters, participated, participation rate, time remaining).
    - Strictly excludes candidate tallies, vote choices, or individual ballot records.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, election_id):
        election, error_response = get_election_for_creator_or_403(election_id, request.user)
        if error_response:
            return error_response

        total_eligible_voters = election.eligible_voters.count()
        voters_participated = election.eligible_voters.filter(has_voted=True).count()

        # Handle 0 voters safely (zero division protection)
        if total_eligible_voters > 0:
            participation_rate = round((voters_participated / total_eligible_voters) * 100, 2)
        else:
            participation_rate = 0.0

        # Time remaining calculation
        time_remaining_seconds = None
        now = timezone.now()
        if election.status == 'active' and election.end_datetime:
            if election.end_datetime > now:
                time_remaining_seconds = int((election.end_datetime - now).total_seconds())
            else:
                time_remaining_seconds = 0

        payload = {
            "election_id": election.id,
            "title": election.title,
            "current_status": election.status,
            "is_locked": election.is_locked,
            "start_datetime": election.start_datetime,
            "end_datetime": election.end_datetime,
            "actual_start_at": election.actual_start_at,
            "total_eligible_voters": total_eligible_voters,
            "voters_participated": voters_participated,
            "participation_rate": participation_rate,
            "time_remaining_seconds": time_remaining_seconds
        }

        serializer = ElectionMonitoringSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)
