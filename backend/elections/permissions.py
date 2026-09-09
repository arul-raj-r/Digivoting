from rest_framework import permissions
from authentication.models import User

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
