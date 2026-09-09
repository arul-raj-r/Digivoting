from django.utils import timezone
from authentication.utils import log_event
from elections.models import ElectionAuditLog

def get_client_ip(request):
    """Helper to extract IP address from request."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

def log_election_action(election, action, actor=None, details=None, request=None):
    """
    Centralized audit logging helper for election actions (Module 11).
    Creates an ElectionAuditLog entry and selectively logs to platform AuditLog
    for high-level operational lifecycle events.
    """
    if details is None:
        details = {}

    ip_address = get_client_ip(request) if request else None

    # Derive actor from request if not explicitly provided
    if actor is None and request and hasattr(request, 'user') and request.user.is_authenticated:
        actor = request.user

    # 1. Create specific ElectionAuditLog
    audit_entry = ElectionAuditLog.objects.create(
        election=election,
        actor=actor if (actor and actor.is_authenticated) else None,
        action=action,
        details=details,
        ip_address=ip_address
    )

    # 2. Dual-log high-level lifecycle events to platform-wide AuditLog (for Admin Security Dashboard)
    LIFECYCLE_ACTIONS_MAP = {
        'started': ('ELECTION_STARTED', 'WARNING'),
        'stopped': ('ELECTION_STOPPED', 'CRITICAL'),
        'auto_transitioned': ('ELECTION_AUTO_TRANSITION', 'INFO'),
        'created': ('ELECTION_CREATION', 'INFO'),
    }

    if action in LIFECYCLE_ACTIONS_MAP:
        platform_event, severity = LIFECYCLE_ACTIONS_MAP[action]
        dual_details = {
            'election_id': str(election.id),
            'title': election.title,
            **details
        }
        log_event(
            actor,
            platform_event,
            request=request,
            details=dual_details,
            severity=severity
        )

    return audit_entry
