import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import F, Count
from authentication.models import User, LoginAttempt, SecurityEvent

logger = logging.getLogger(__name__)

LOCKOUT_THRESHOLD = 5         # 5 failed attempts
ROLLING_WINDOW_MINUTES = 15   # within 15-minute rolling window
LOCKOUT_DURATION_MINUTES = 30 # locked for 30 minutes


def evaluate_account_lockout(user, ip_address=None, user_agent=None):
    """
    Checks if account is locked, applies auto-unlock if expired,
    and returns (is_locked, message, locked_until).
    """
    now = timezone.now()

    # 1. If currently marked LOCKED
    if user.account_status == 'LOCKED':
        if user.locked_until and user.locked_until <= now:
            # Auto-unlock expired lockout
            with transaction.atomic():
                user.account_status = 'ACTIVE'
                user.failed_login_count = 0
                user.locked_at = None
                user.locked_until = None
                user.save(update_fields=['account_status', 'failed_login_count', 'locked_at', 'locked_until'])

                SecurityEvent.objects.create(
                    user=user,
                    event_type='account_auto_unlocked',
                    ip_address=ip_address,
                    metadata={'reason': 'Lockout duration expired'}
                )
            logger.info("Account auto-unlocked for citizen: %s", user.email)
            return False, None, None

        # Still within active lockout period
        remaining_secs = int((user.locked_until - now).total_seconds()) if user.locked_until else 1800
        remaining_mins = max(1, (remaining_secs + 59) // 60)
        msg = f"This account is temporarily locked due to multiple failed attempts. Try again in {remaining_mins} minute{'s' if remaining_mins != 1 else ''} or contact support."
        return True, msg, user.locked_until

    return False, None, None


def record_login_failure_and_check_lockout(user, ip_address=None, user_agent=None):
    """
    Records login failure and evaluates rolling-window threshold (5 failures in 15 mins).
    Returns (is_now_locked, attempts_remaining, warning_msg, locked_until).
    """
    now = timezone.now()
    rolling_cutoff = now - timedelta(minutes=ROLLING_WINDOW_MINUTES)

    with transaction.atomic():
        # Query failed attempts within rolling 15-minute window
        recent_failures_count = LoginAttempt.objects.filter(
            email_attempted__iexact=user.email,
            success=False,
            timestamp__gte=rolling_cutoff
        ).count()

        # user.failed_login_count is already incremented in LoginView
        total_failures = max(user.failed_login_count, recent_failures_count)

        if total_failures >= LOCKOUT_THRESHOLD:
            # Lock the account
            locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            user.account_status = 'LOCKED'
            user.locked_at = now
            user.locked_until = locked_until
            user.save(update_fields=['account_status', 'locked_at', 'locked_until'])

            SecurityEvent.objects.create(
                user=user,
                event_type='account_locked',
                ip_address=ip_address,
                metadata={
                    'failures_count': total_failures,
                    'locked_until': locked_until.isoformat(),
                    'user_agent': user_agent
                }
            )

            logger.warning("Account locked for user %s due to %d failed attempts in %d mins.",
                           user.email, total_failures, ROLLING_WINDOW_MINUTES)
            
            return True, 0, "Account has been temporarily locked for 30 minutes due to 5 consecutive failed login attempts.", locked_until

        # Compute remaining attempts before lockout
        attempts_remaining = max(1, LOCKOUT_THRESHOLD - total_failures)
        warning_msg = None
        if total_failures >= 3:
            warning_msg = f"{attempts_remaining} attempt{'s' if attempts_remaining != 1 else ''} remaining before temporary account lockout."

        return False, attempts_remaining, warning_msg, None


def detect_suspicious_ip_activity(ip_address, user_agent=None):
    """
    Heuristic detection for credential stuffing:
    Checks if > 5 distinct emails were attempted from the same IP within 5 minutes.
    Logs SecurityEvent(event_type='suspicious_pattern') without blocking normal flow.
    """
    if not ip_address:
        return

    now = timezone.now()
    window_cutoff = now - timedelta(minutes=5)

    distinct_targets = LoginAttempt.objects.filter(
        ip_address=ip_address,
        timestamp__gte=window_cutoff
    ).values('email_attempted').distinct().count()

    if distinct_targets >= 5:
        # Check if already flagged in the last 15 minutes to prevent spamming the audit log
        already_flagged = SecurityEvent.objects.filter(
            ip_address=ip_address,
            event_type='suspicious_pattern',
            created_at__gte=now - timedelta(minutes=15)
        ).exists()

        if not already_flagged:
            SecurityEvent.objects.create(
                user=None,
                event_type='suspicious_pattern',
                ip_address=ip_address,
                metadata={
                    'reason': 'Credential stuffing signature detected',
                    'distinct_emails_targeted': distinct_targets,
                    'window_minutes': 5,
                    'user_agent': user_agent
                }
            )
            logger.warning("Suspicious credential stuffing pattern flagged for IP %s (%d distinct emails targeted).",
                           ip_address, distinct_targets)
