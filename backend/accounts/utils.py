import secrets
import hashlib
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from authentication.models import EmailVerificationToken

logger = logging.getLogger(__name__)


def generate_and_send_verification_email(user, request=None):
    """
    Module 4: Email Verification Token Generator & Dispatcher.
    - Generates 64-char cryptographically random URL-safe raw token.
    - Stores ONLY SHA-256 hash in database (hash-only token storage best practice).
    - Raw token exists solely in the verification URL emailed to citizen.
    - Invalidates all previous unused tokens for this user.
    - Renders official ECI civic HTML & plaintext email templates.
    """
    # Generate 64-character URL-safe random token
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = timezone.now() + timedelta(hours=24)

    # Invalidate previous unused tokens for this user
    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

    # Store hash in DB
    EmailVerificationToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=expires_at,
        used=False
    )

    # Build verification link
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    verification_url = f"{frontend_url.rstrip('/')}/verify-email?token={raw_token}"

    full_name = getattr(user, 'first_name', '') or getattr(user, 'username', '')
    if hasattr(user, 'user_profile') and user.user_profile.full_name:
        full_name = user.user_profile.full_name

    context = {
        'user_full_name': full_name or user.email,
        'verification_url': verification_url,
        'expires_hours': 24,
    }

    try:
        html_message = render_to_string('emails/verify_email.html', context)
        plain_message = render_to_string('emails/verify_email.txt', context)
    except Exception as e:
        logger.warning("Could not render template: %s. Using fallback plain text.", e)
        plain_message = (
            f"Citizen {full_name},\n\n"
            f"Please verify your DigiVote email address by opening this link:\n{verification_url}\n\n"
            f"This link expires in 24 hours."
        )
        html_message = None

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in')

    try:
        send_mail(
            subject='Verify Your DigiVote Account - Election Commission of India',
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Verification email successfully dispatched to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", user.email, str(e), exc_info=True)

    return {
        'raw_token': raw_token,
        'token_hash': token_hash,
        'expires_at': expires_at,
        'verification_url': verification_url
    }


def generate_and_send_otp_email(user, request=None):
    """
    Module 5: Secure 6-Digit OTP Generator & Email Dispatcher.
    - Generates 6-digit integer code via secrets.randbelow.
    - Computes SHA-256 hash and stores ONLY hash in OTPCode table.
    - Sets expires_at = now + 5 minutes.
    - Invalidates all previous unused OTP codes for this user.
    - Plaintext code is delivered only via transient email (never logged/stored in DB).
    """
    from authentication.models import OTPCode

    # Generate cryptographically secure 6-digit random code
    plain_otp = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hashlib.sha256(plain_otp.encode()).hexdigest()
    expiry_seconds = getattr(settings, 'OTP_EXPIRY_SECONDS', 300)
    expires_at = timezone.now() + timedelta(seconds=expiry_seconds)
    max_attempts = getattr(settings, 'OTP_MAX_ATTEMPTS', 3)

    # Invalidate prior unused OTPs for this user
    OTPCode.objects.filter(user=user, used=False).update(used=True)

    # Create new OTPCode entry with hash
    otp_record = OTPCode.objects.create(
        user=user,
        code_hash=code_hash,
        delivery_channel='email',
        attempt_count=0,
        max_attempts=max_attempts,
        used=False,
        expires_at=expires_at
    )

    full_name = getattr(user, 'first_name', '') or getattr(user, 'username', '')
    if hasattr(user, 'user_profile') and user.user_profile.full_name:
        full_name = user.user_profile.full_name

    context = {
        'user_full_name': full_name or user.email,
        'otp_code': plain_otp,
        'expires_minutes': max(1, expiry_seconds // 60),
    }

    try:
        html_message = render_to_string('emails/otp_code.html', context)
        plain_message = render_to_string('emails/otp_code.txt', context)
    except Exception as e:
        logger.warning("Could not render OTP template: %s. Using fallback plain text.", e)
        plain_message = (
            f"Citizen {full_name},\n\n"
            f"Your DigiVote One-Time Security Code (OTP) is: {plain_otp}\n\n"
            f"This code expires in {max(1, expiry_seconds // 60)} minutes. Never share this code."
        )
        html_message = None

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in')

    try:
        send_mail(
            subject='Your DigiVote One-Time Security Code (OTP)',
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("OTP successfully dispatched to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", user.email, str(e), exc_info=True)

    return {
        'otp_id': str(otp_record.id),
        'expires_at': expires_at,
        'channel': 'email'
    }


def generate_and_send_password_reset_email(user, request=None):
    """
    Password Reset Token Generator & Dispatcher.
    - Generates 64-char URL-safe raw token.
    - Stores SHA-256 hash in PasswordResetToken.
    - Expiry = now + PASSWORD_RESET_EXPIRY_MINUTES (default 60 mins).
    - Invalidates all prior unused reset tokens for this user.
    - Sends email with reset URL: {FRONTEND_URL}/reset-password?token={raw_token}
    """
    from authentication.models import PasswordResetToken
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expiry_minutes = getattr(settings, 'PASSWORD_RESET_EXPIRY_MINUTES', 60)
    expires_at = timezone.now() + timedelta(minutes=expiry_minutes)

    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=expires_at,
        used=False
    )

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url.rstrip('/')}/reset-password?token={raw_token}"

    full_name = getattr(user, 'first_name', '') or getattr(user, 'username', '')
    if hasattr(user, 'user_profile') and user.user_profile.full_name:
        full_name = user.user_profile.full_name

    plain_message = (
        f"Hello {full_name},\n\n"
        f"A password reset request was received for your DigiVote account.\n"
        f"Click the link below to set a new password:\n{reset_url}\n\n"
        f"This link expires in {expiry_minutes} minutes. If you did not request this, please ignore this email."
    )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in')
    try:
        send_mail(
            subject='Reset Your DigiVote Password',
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Password reset email dispatched to: %s", user.email)
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", user.email, str(e), exc_info=True)

    return {
        'raw_token': raw_token,
        'token_hash': token_hash,
        'expires_at': expires_at,
        'reset_url': reset_url
    }


