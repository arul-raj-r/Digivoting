from rest_framework import permissions
from authentication.models import User
from django.utils import timezone

class CanManageElections(permissions.BasePermission):
    """
    Permission class for Election Management actions in unified workspace.
    Grants access if the user is authenticated.
    Individual election management views enforce creator ownership (election.created_by == request.user).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

# Explicit alias for semantic clarity matching requirements
IsElectionCreator = CanManageElections


def check_election_configuration_unlocked(election):
    """
    Checks if an election's voter roster, candidate list, verification config, or rules
    can be modified.
    Returns (is_allowed: bool, error_message: str or None).
    """
    if election.is_configuration_locked():
        return False, f"Configuration is permanently locked because election is '{election.status}' or locked."
    return True, None


def check_election_rescheduling_allowed(election):
    """
    Checks if an election's schedule (start_datetime / end_datetime) can be modified.
    Returns (is_allowed: bool, error_message: str or None).
    """
    if not election.is_rescheduling_allowed():
        return False, f"Election dates cannot be edited because election is '{election.status}'."
    return True, None


def synchronize_election_lifecycle(election):
    """Apply the persisted schedule when an election is accessed.

    The scheduled transition command remains useful for unattended operation,
    but normal API traffic must never present a stale ``scheduled`` election as
    not live (or an expired election as live). Configuration is locked at the
    first transition to active.
    """
    now = timezone.now()
    previous_status = election.status

    if election.status == 'scheduled' and election.start_datetime and election.start_datetime <= now:
        election.status = 'active'
        election.is_locked = True
        if not election.actual_start_at:
            election.actual_start_at = now
    # PAUSED and CANCELLED must remain in their states; only active elections auto-complete
    if election.status == 'active' and election.end_datetime and election.end_datetime <= now:
        election.status = 'completed'

    if election.status != previous_status:
        election.save(update_fields=['status', 'is_locked', 'actual_start_at', 'updated_at'])
        from elections.audit import log_election_action
        log_election_action(
            election=election,
            action='auto_transitioned',
            actor=None,
            details={'from': previous_status, 'to': election.status, 'transitioned_at': now.isoformat()},
        )
    return election
