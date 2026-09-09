from rest_framework import permissions


class IsElectionAdminUser(permissions.BasePermission):
    """
    Permission check for DigiVote election administrators and staff (Module 7).
    Grants access only if request.user is authenticated and (is_staff or role == 'ADMIN').
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            (user.is_staff or getattr(user, 'role', '') == 'ADMIN')
        )
