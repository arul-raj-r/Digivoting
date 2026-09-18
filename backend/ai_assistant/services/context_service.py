import logging
from typing import Optional, Dict, Any, Tuple
from django.utils import timezone
from django.db.models import Q

logger = logging.getLogger('ai_assistant')


class DatabaseContextService:
    """
    Read-only service to gather safe, authorized database context
    from existing DigiVote models (User, Election, EligibleVoter, Candidate, etc.).
    """

    @staticmethod
    def get_user_context(user) -> Dict[str, Any]:
        """
        Extract safe profile information for the authenticated user.
        """
        if not user or not user.is_authenticated:
            return {}

        full_name = getattr(user, 'full_name', '')
        if not full_name and hasattr(user, 'user_profile') and user.user_profile:
            full_name = getattr(user.user_profile, 'full_name', '')
        if not full_name:
            full_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        if not full_name:
            full_name = getattr(user, 'username', '')

        email_verified = getattr(user, 'email_verified', None)
        if email_verified is None:
            email_verified = getattr(user, 'is_email_verified', False)

        status_val = getattr(user, 'account_status', None) or getattr(user, 'status', 'ACTIVE')

        return {
            "email": getattr(user, 'email', ''),
            "full_name": full_name or getattr(user, 'email', ''),
            "status": status_val,
            "is_email_verified": email_verified,
        }

    @staticmethod
    def validate_election_access(user, election_id: str) -> Tuple[bool, Optional[Any], str]:
        """
        Validate whether the user is authorized to access contextual data for an election.
        Allowed roles:
        1. 'owner' - The user created/administers the election.
        2. 'voter' - The user is registered as an eligible voter for this election.

        Returns: (is_authorized: bool, election: Optional[Election], role: str)
        """
        if not user or not user.is_authenticated:
            return False, None, "unauthenticated"

        if not election_id:
            return False, None, "missing_election_id"

        from elections.models import Election, EligibleVoter

        try:
            election = Election.objects.select_related(
                'created_by', 'verification_config', 'rules'
            ).prefetch_related('candidates').get(id=election_id)
        except (Election.DoesNotExist, ValueError):
            return False, None, "not_found"
        except Exception as e:
            logger.error("Error retrieving election %s: %s", election_id, str(e))
            return False, None, "error"

        # Check 1: Owner / Creator access
        if election.created_by_id == user.id:
            return True, election, "owner"

        # Check 2: Eligible Voter access (by user FK or verified email)
        user_email = (getattr(user, 'email', '') or '').strip()
        is_eligible = EligibleVoter.objects.filter(
            election=election
        ).filter(
            Q(user=user) | Q(email__iexact=user_email)
        ).exists()

        if is_eligible:
            return True, election, "voter"

        # Unrelated user
        return False, election, "unauthorized"

    @classmethod
    def get_election_context(cls, user, election, role: str) -> Dict[str, Any]:
        """
        Assemble safe, authorized context for an election based on the user's role.
        NEVER leaks full voter rolls or other voters' personal details.
        """
        now = timezone.now()

        # Determine if the election is actively open for voting right now
        is_active_status = election.status == 'active'
        is_within_time = True
        if election.start_datetime and now < election.start_datetime:
            is_within_time = False
        if election.end_datetime and now > election.end_datetime:
            is_within_time = False

        is_voting_open = is_active_status and is_within_time

        # Verification config
        vc = getattr(election, 'verification_config', None)
        verification_reqs = {
            "require_email_otp": getattr(vc, 'require_email_otp', True) if vc else True,
            "require_webcam_verification": getattr(vc, 'require_webcam_verification', False) if vc else False,
            "require_biometric_verification": getattr(vc, 'require_biometric_verification', False) if vc else False,
        }

        # Rules
        rules = getattr(election, 'rules', None)
        rules_info = {
            "results_visibility": getattr(rules, 'results_visibility', 'manual') if rules else 'manual',
            "allow_vote_change": getattr(rules, 'allow_vote_change', False) if rules else False,
        }

        # Public candidate summaries (for informational, neutral answers)
        candidates_data = []
        try:
            active_candidates = election.candidates.filter(is_active=True).order_by('display_order', 'added_at')
            for c in active_candidates:
                candidates_data.append({
                    "name": c.full_name,
                    "party_or_affiliation": c.party_or_affiliation or "Independent / None",
                    "bio": c.bio or ""
                })
        except Exception as e:
            logger.warning("Failed to collect candidates for election %s: %s", election.id, str(e))

        context: Dict[str, Any] = {
            "election_id": str(election.id),
            "title": election.title,
            "description": election.description or "",
            "organization": election.organization or "",
            "election_type": election.election_type,
            "status": election.status,
            "start_datetime": election.start_datetime.isoformat() if election.start_datetime else None,
            "end_datetime": election.end_datetime.isoformat() if election.end_datetime else None,
            "is_locked": election.is_locked,
            "is_voting_open": is_voting_open,
            "verification_requirements": verification_reqs,
            "rules": rules_info,
            "candidates": candidates_data,
            "role": role,
        }

        # Voter-specific context
        if role == "voter":
            from elections.models import EligibleVoter
            user_email = (getattr(user, 'email', '') or '').strip()
            voter_rec = EligibleVoter.objects.filter(
                election=election
            ).filter(
                Q(user=user) | Q(email__iexact=user_email)
            ).first()

            if voter_rec:
                # Check single-use voting authorization (if issued and unconsumed)
                has_active_auth = False
                try:
                    from voting.models import VotingAuthorization
                    has_active_auth = VotingAuthorization.objects.filter(
                        election=election,
                        voter=voter_rec,
                        consumed=False,
                        expires_at__gt=now
                    ).exists()
                except Exception as e:
                    logger.debug("Could not query VotingAuthorization: %s", str(e))

                can_vote_now = (
                    is_voting_open and
                    not voter_rec.has_voted and
                    voter_rec.verification_status in ['VERIFIED', 'FACE_VERIFIED']
                )

                context["voter_info"] = {
                    "is_eligible": True,
                    "verification_status": voter_rec.verification_status,
                    "has_voted": voter_rec.has_voted,
                    "voted_at": voter_rec.voted_at.isoformat() if voter_rec.voted_at else None,
                    "has_active_voting_authorization": has_active_auth,
                    "can_vote_now": can_vote_now
                }

        # Owner-specific context (Aggregate counts ONLY, strictly zero voter lists)
        elif role == "owner":
            try:
                voter_count = election.eligible_voters.count()
            except Exception:
                voter_count = 0

            context["owner_info"] = {
                "is_owner": True,
                "total_registered_eligible_voters": voter_count,
                "total_candidates": len(candidates_data)
            }

        return context
