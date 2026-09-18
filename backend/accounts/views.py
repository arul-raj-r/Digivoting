import secrets
import logging
from datetime import timedelta
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.throttling import AnonRateThrottle

from authentication.models import User, UserProfile
from accounts.serializers import RegisterSerializer, UserSerializer
from accounts.utils import generate_and_send_verification_email

logger = logging.getLogger(__name__)


class RegisterRateThrottle(AnonRateThrottle):
    """
    Rate limit throttle to prevent registration spam / bot account flooding.
    """
    rate = '15/minute'


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Module 1: User Registration Endpoint.
    - Validates all fields server-side with strict password complexity rules.
    - Performs case-insensitive email check and mobile uniqueness check.
    - Returns structured 409 Conflict if account already exists.
    - Hashes password using Django's built-in PBKDF2/Argon2 hasher.
    - Creates user with status='pending_verification' and is_email_verified=False.
    - Returns 201 Created with sanitized user payload (no password/hashes leaked).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            # Format first validation error cleanly
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "field": first_field,
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        email = validated['email'].strip().lower()
        mobile_number = validated['mobile_number'].strip().replace(" ", "").replace("-", "")
        full_name = validated['full_name'].strip()
        password = validated['password']

        # 1. Check duplicate email (case-insensitive) -> 409 Conflict
        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user:
            is_verified = bool(existing_user.email_verified or existing_user.account_status == 'ACTIVE')
            if is_verified:
                if not existing_user.email_verified or existing_user.account_status != 'ACTIVE':
                    existing_user.email_verified = True
                    if existing_user.account_status == 'PENDING_EMAIL_VERIFICATION':
                        existing_user.account_status = 'ACTIVE'
                    existing_user.save(update_fields=['email_verified', 'account_status'])
                return Response({
                    "success": False,
                    "code": "ACCOUNT_EXISTS_VERIFIED",
                    "field": "email",
                    "message": "This email is already registered and verified. Please log in instead.",
                    "action": "LOGIN"
                }, status=status.HTTP_409_CONFLICT)
            else:
                # Existing unverified user: do not create duplicate account, allow/recommend verification
                # Resend fresh verification OTP/token
                from accounts.utils import generate_and_send_verification_email
                token_data = generate_and_send_verification_email(existing_user, request)
                logger.info("Dispatched fresh verification code for existing unverified user: %s", email)
                return Response({
                    "success": False,
                    "code": "ACCOUNT_EXISTS_UNVERIFIED",
                    "field": "email",
                    "message": "This email is already registered but not verified yet. A fresh verification code has been sent to your email.",
                    "action": "VERIFY_EMAIL",
                    "email": existing_user.email,
                    "resend_available": True
                }, status=status.HTTP_409_CONFLICT)

        # 2. Check duplicate mobile number -> 409 Conflict
        # Check both User and UserProfile / phone fields
        mobile_exists = (
            User.objects.filter(phone_number=mobile_number).exists() or
            UserProfile.objects.filter(mobile_number=mobile_number).exists()
        )
        if mobile_exists:
            return Response({
                "success": False,
                "field": "mobile_number",
                "message": "This mobile number is already registered with another account."
            }, status=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                # Derive safe username internally from email prefix
                base_username = email.split('@')[0]
                unique_suffix = secrets.token_hex(4)
                username = f"{base_username}_{unique_suffix}"

                # Parse first/last name safely for AbstractUser fields
                name_parts = full_name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ''

                # Secure user creation with hashed password
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=mobile_number,
                    role=User.VOTER,
                    account_status='PENDING_EMAIL_VERIFICATION',
                    email_verified=False
                )

                # Attach profile information
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.full_name = full_name
                profile.mobile_number = mobile_number
                profile.save()

                # Dispatch real verification email with hash-only token (Module 4)
                from accounts.utils import generate_and_send_verification_email
                token_data = generate_and_send_verification_email(user, request)
                logger.info("Dispatched verification email for newly registered user: %s", email)

                # Construct sanitized output object (no password fields included)
                user_data = {
                    "id": str(user.id),
                    "full_name": full_name,
                    "email": user.email,
                    "mobile_number": mobile_number,
                    "status": "pending_verification",
                    "is_email_verified": False,
                    "date_joined": user.created_at if hasattr(user, 'created_at') else user.date_joined
                }

                return Response({
                    "success": True,
                    "message": "Account registered successfully. Please verify your email address to proceed.",
                    "user": user_data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("Registration error: %s", str(e), exc_info=True)
            return Response({
                "success": False,
                "message": "Registration could not be completed. Please try again later."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------------------------------------------------------------
# Module 2: Citizen Login Endpoint & Security Controls
# -----------------------------------------------------------------------------

# Precomputed PBKDF2 hash of a dummy password to ensure constant-time response for non-existent users
# Prevents account enumeration via response timing variance
DUMMY_PASSWORD_HASH = "pbkdf2_sha256$600000$dummySaltValueToMaintainTimingSafety$kL+m7e3JpX1r8W8q2O5gN+Z7uX8vQ3="


class LoginRateThrottle(AnonRateThrottle):
    """
    Rate throttle on Login endpoint configured via REST_FRAMEWORK settings (15/minute).
    """
    scope = 'login'



def get_client_ip(request):
    """
    Extract client IP safely from X-Forwarded-For (proxy) or REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def mask_email(email):
    """
    Mask email address for privacy (e.g. j***@domain.com).
    """
    if not email or '@' not in email:
        return email
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 1:
        masked_local = f"{local_part}***"
    else:
        masked_local = f"{local_part[0]}***{local_part[-1] if len(local_part) > 2 else ''}"
    return f"{masked_local}@{domain}"


def mask_mobile(phone_number):
    """
    Null-safe mobile number masking (e.g. +91 ******1234).
    """
    if not phone_number:
        return None
    clean = phone_number.strip().replace(" ", "").replace("-", "")
    if len(clean) >= 10:
        return f"+91 ******{clean[-4:]}"
    elif len(clean) >= 4:
        return f"******{clean[-4:]}"
    return "***"


def generate_pre_auth_token(user, remember_device=False):
    """
    Generate short-lived signed pre-auth JWT token (valid for 5 minutes).
    Scoped explicitly to token_type='pre_auth' and state='PENDING_MFA'.
    NOTE FOR MODULE 6: Standard protected session endpoints MUST reject tokens
    where token_type != 'full_session'.
    """
    import jwt
    from datetime import timedelta
    from django.utils import timezone
    from django.conf import settings

    now = timezone.now()
    expires_at = now + timedelta(minutes=5)
    
    payload = {
        'user_id': str(user.id),
        'email': user.email,
        'token_type': 'pre_auth',
        'state': 'PENDING_MFA',
        'remember_device': remember_device,
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp())
    }
    
    signing_key = getattr(settings, 'SECRET_KEY', 'digivote-secret')
    token = jwt.encode(payload, signing_key, algorithm='HS256')
    return token, expires_at


class LoginView(APIView):
    """
    POST /api/auth/login/
    Module 2: Citizen Login Endpoint.
    - Accepts email + password + optional remember_device.
    - Constant-time dummy hash comparison for non-existent users.
    - Generic error messages for credential failures to prevent user enumeration.
    - Account status validation (PENDING_EMAIL_VERIFICATION, SUSPENDED, ACTIVE).
    - Failed attempt tracking via LoginAttempt model and atomic F('failed_login_count').
    - Rate throttled at 5 requests/minute.
    - Issues short-lived pre-auth token (PENDING_MFA) for Module 5 (OTP) handoff.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        from django.contrib.auth.hashers import check_password
        from django.db.models import F
        from django.utils import timezone
        from authentication.models import LoginAttempt
        from accounts.serializers import LoginSerializer

        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "field": first_field,
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']
        remember_device = serializer.validated_data.get('remember_device', False)
        
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Heuristic suspicious credential stuffing detection (Module 7)
        from accounts.services.lockout import (
            evaluate_account_lockout,
            record_login_failure_and_check_lockout,
            detect_suspicious_ip_activity
        )
        detect_suspicious_ip_activity(ip_address, user_agent)

        # Lookup user (case-insensitive)
        user = User.objects.filter(email__iexact=email).first()

        # 1. NON-EXISTENT USER: Execute dummy hash comparison for timing safety
        if not user:
            # Perform exact same hashing effort
            check_password(password, DUMMY_PASSWORD_HASH)
            
            # Record failed login attempt without user link
            LoginAttempt.objects.create(
                user=None,
                email_attempted=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="INVALID_CREDENTIALS"
            )

            return Response({
                "success": False,
                "message": "Invalid email or password. Please verify your credentials and try again."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # 2. CHECK EXISTING USER LOCKOUT STATUS (Module 7)
        is_locked, lock_msg, locked_until = evaluate_account_lockout(user, ip_address, user_agent)
        if is_locked:
            LoginAttempt.objects.create(
                user=user,
                email_attempted=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="ACCOUNT_LOCKED"
            )
            return Response({
                "success": False,
                "code": "ACCOUNT_LOCKED",
                "message": lock_msg,
                "locked_until": locked_until.isoformat() if locked_until else None
            }, status=status.HTTP_403_FORBIDDEN)

        # 3. USER EXISTS: Check password
        is_password_valid = user.check_password(password)

        if not is_password_valid:
            # Increment failed_login_count atomically
            User.objects.filter(id=user.id).update(
                failed_login_count=F('failed_login_count') + 1,
                last_login_attempt=timezone.now()
            )
            user.refresh_from_db(fields=['failed_login_count'])

            LoginAttempt.objects.create(
                user=user,
                email_attempted=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="INVALID_PASSWORD"
            )

            # Evaluate rolling-window lockout threshold (5 failed attempts in 15 mins)
            is_now_locked, attempts_left, warning_msg, locked_until_time = record_login_failure_and_check_lockout(
                user, ip_address, user_agent
            )

            if is_now_locked:
                return Response({
                    "success": False,
                    "code": "ACCOUNT_LOCKED",
                    "message": "Account has been temporarily locked for 30 minutes due to 5 failed login attempts. Please contact support or try again later.",
                    "locked_until": locked_until_time.isoformat() if locked_until_time else None
                }, status=status.HTTP_403_FORBIDDEN)

            response_data = {
                "success": False,
                "message": "Invalid email or password. Please verify your credentials and try again."
            }
            if warning_msg:
                response_data["warning"] = warning_msg
                response_data["failed_attempts"] = user.failed_login_count
                response_data["attempts_remaining"] = attempts_left

            return Response(response_data, status=status.HTTP_401_UNAUTHORIZED)

        # 4. PASSWORD CORRECT: Check Account Status
        # Check if email is unverified
        is_verified = bool(user.email_verified or user.account_status == 'ACTIVE')
        if not is_verified:
            LoginAttempt.objects.create(
                user=user,
                email_attempted=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="PENDING_EMAIL_VERIFICATION"
            )
            return Response({
                "success": False,
                "code": "EMAIL_VERIFICATION_REQUIRED",
                "error_code": "EMAIL_NOT_VERIFIED",
                "detail": "Your email is not verified yet.",
                "message": "Your email is not verified yet. Please verify your email before logging in.",
                "resend_available": True,
                "email": user.email
            }, status=status.HTTP_403_FORBIDDEN)

        # Self-heal flags if fields are out of sync
        if not user.email_verified or user.account_status == 'PENDING_EMAIL_VERIFICATION':
            user.email_verified = True
            if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                user.account_status = 'ACTIVE'
            user.save(update_fields=['email_verified', 'account_status'])

        # Check if suspended / locked / deactivated
        if user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
            LoginAttempt.objects.create(
                user=user,
                email_attempted=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason=f"ACCOUNT_{user.account_status}"
            )
            return Response({
                "success": False,
                "code": f"ACCOUNT_{user.account_status}",
                "message": f"This account is {user.account_status.lower()}. Please contact Election Commission support."
            }, status=status.HTTP_403_FORBIDDEN)

        # 4. ACTIVE ACCOUNT: Successful Primary Factor Verification
        # Reset failed login count atomically
        User.objects.filter(id=user.id).update(
            failed_login_count=0,
            last_login_attempt=timezone.now()
        )

        # Log successful attempt
        LoginAttempt.objects.create(
            user=user,
            email_attempted=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            failure_reason=None
        )

        # Dispatch initial 6-digit OTP code to citizen's registered contact
        from accounts.utils import generate_and_send_otp_email
        otp_info = generate_and_send_otp_email(user, request)

        # Issue pre-auth token valid for configured OTP window
        pre_auth_token, expires_at = generate_pre_auth_token(user, remember_device=remember_device)

        # Retrieve mobile number safely
        mobile_num = getattr(user, 'phone_number', None)
        if not mobile_num and hasattr(user, 'user_profile'):
            mobile_num = user.user_profile.mobile_number

        expiry_secs = getattr(settings, 'OTP_EXPIRY_SECONDS', 300)
        cooldown_secs = getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 30)
        max_attempts = getattr(settings, 'OTP_MAX_ATTEMPTS', 3)

        destination_info = {
            "masked_email": mask_email(user.email)
        }
        if mobile_num:
            destination_info["masked_mobile"] = mask_mobile(mobile_num)

        return Response({
            "success": True,
            "message": "Password verified successfully. Verification OTP sent to your registered email address.",
            "auth_state": "PENDING_MFA",
            "status": "OTP_REQUIRED",
            "challenge_id": pre_auth_token,
            "pre_auth_token": pre_auth_token,
            "email": user.email,
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": expiry_secs,
            "cooldown_seconds": cooldown_secs,
            "max_attempts": max_attempts,
            "mfa_required": True,
            "destination": destination_info
        }, status=status.HTTP_200_OK)


# -----------------------------------------------------------------------------
# Module 3: Google Authentication (OAuth 2.0 Server-Side Verification)
# -----------------------------------------------------------------------------

class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Module 3: Google Sign-In & Registration Endpoint.
    - Accepts Google ID token from frontend.
    - Validates server-side with google.oauth2.id_token.verify_oauth2_token.
    - If user exists without google_id: links account, marks active + verified.
    - If user exists with DIFFERENT google_id: rejects with 409 Conflict (prevents takeover).
    - If user does not exist: creates new User (active, verified, unusable password) + UserProfile.
    - Logs LoginAttempt with method='google_oauth'.
    - Issues pre-auth token (PENDING_MFA) for Module 5 (OTP) handoff.
    - Never logs or stores raw Google ID token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        from authentication.models import LoginAttempt
        from accounts.serializers import GoogleAuthSerializer

        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Valid Google ID token or credential is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        raw_id_token = (
            serializer.validated_data.get('token') or
            serializer.validated_data.get('id_token') or
            serializer.validated_data.get('credential')
        )
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Server-side verification with Google public keys
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '').strip()
        id_info = None
        verification_error = None

        # 1. Primary verification: verify signature & claims with clock skew tolerance
        try:
            id_info = google_id_token.verify_oauth2_token(
                raw_id_token,
                google_requests.Request(),
                audience=google_client_id if google_client_id else None,
                clock_skew_in_seconds=120
            )
        except Exception as e:
            verification_error = e
            logger.warning("Primary Google ID token verification failed: %s. Attempting tokeninfo fallback...", str(e))
            print(f"[GOOGLE AUTH] Primary verification failed ({e}). Checking tokeninfo fallback...")

            # 2. Fallback: Google's official server-side tokeninfo endpoint
            # Resolves local clock skew, certificate cache staleness, or container TLS handshake issues
            try:
                import urllib.request
                import json
                tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={raw_id_token}"
                req = urllib.request.Request(tokeninfo_url, headers={'User-Agent': 'DigiVote-Auth/1.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode('utf-8'))
                        token_aud = data.get('aud')
                        if google_client_id and token_aud != google_client_id:
                            raise ValueError(f"Token audience mismatch: expected {google_client_id}, got {token_aud}")
                        id_info = data
                        logger.info("Google ID token verified successfully via tokeninfo fallback.")
                        print("[GOOGLE AUTH] Token verified successfully via tokeninfo fallback.")
            except Exception as fallback_err:
                logger.warning("Google tokeninfo fallback verification failed: %s", str(fallback_err))
                print(f"[GOOGLE AUTH] Fallback verification failed: {fallback_err}")

        if not id_info:
            err_msg = str(verification_error) if verification_error else "Token invalid or expired"
            logger.warning("Google ID token verification failed: %s", err_msg)
            print(f"[GOOGLE AUTH ERROR] All verification attempts failed: {err_msg}")
            user_message = "Google authentication failed. The token is invalid or expired."
            if getattr(settings, 'DEBUG', False):
                user_message = f"Google authentication failed: {err_msg}"
            return Response({
                "success": False,
                "message": user_message,
                "detail": err_msg if getattr(settings, 'DEBUG', False) else None
            }, status=status.HTTP_401_UNAUTHORIZED)

        google_sub = id_info.get('sub')
        google_email = id_info.get('email', '').strip().lower()
        google_name = id_info.get('name', '') or id_info.get('given_name', '') or google_email.split('@')[0]
        email_verified_val = id_info.get('email_verified', False)
        email_verified_by_google = email_verified_val is True or str(email_verified_val).lower() == 'true'

        if not google_email or not google_sub:
            return Response({
                "success": False,
                "message": "Incomplete profile received from Google."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check existing user by email
        existing_user = User.objects.filter(email__iexact=google_email).first()

        if existing_user:
            # Conflict prevention: Check if already bound to another Google ID
            if existing_user.google_id and existing_user.google_id != google_sub:
                LoginAttempt.objects.create(
                    user=existing_user,
                    email_attempted=google_email,
                    method='google_oauth',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason="GOOGLE_ACCOUNT_CONFLICT"
                )
                return Response({
                    "success": False,
                    "code": "ACCOUNT_CONFLICT",
                    "message": "This email is already linked to a different Google account. Please contact Election Commission support."
                }, status=status.HTTP_409_CONFLICT)

            # Check account status
            if existing_user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
                LoginAttempt.objects.create(
                    user=existing_user,
                    email_attempted=google_email,
                    method='google_oauth',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason=f"ACCOUNT_{existing_user.account_status}"
                )
                return Response({
                    "success": False,
                    "code": "ACCOUNT_SUSPENDED",
                    "message": "This account has been suspended. Please contact Election Commission support."
                }, status=status.HTTP_403_FORBIDDEN)

            # Link Google ID and activate if previously pending email verification
            with transaction.atomic():
                existing_user.google_id = google_sub
                if not existing_user.email_verified:
                    existing_user.email_verified = True
                if existing_user.account_status == 'PENDING_EMAIL_VERIFICATION':
                    existing_user.account_status = 'ACTIVE'
                existing_user.save()

                user = existing_user

        else:
            # Create new user via Google
            with transaction.atomic():
                base_username = google_email.split('@')[0]
                unique_suffix = secrets.token_hex(4)
                username = f"{base_username}_{unique_suffix}"

                name_parts = google_name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ''

                user = User.objects.create_user(
                    username=username,
                    email=google_email,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.VOTER,
                    account_status='ACTIVE',
                    email_verified=True,
                    google_id=google_sub
                )
                user.set_unusable_password()
                user.save()

                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.full_name = google_name
                profile.save()

        # Audit successful login attempt
        LoginAttempt.objects.create(
            user=user,
            email_attempted=google_email,
            method='google_oauth',
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            failure_reason=None
        )

        # Dispatch 6-digit OTP code to user's registered contact for required MFA
        from accounts.utils import generate_and_send_otp_email
        otp_info = generate_and_send_otp_email(user, request)

        # Issue pre-auth token (PENDING_MFA) for Module 5 handoff
        pre_auth_token, expires_at = generate_pre_auth_token(user, remember_device=False)

        mobile_num = getattr(user, 'phone_number', None)
        if not mobile_num and hasattr(user, 'user_profile'):
            mobile_num = user.user_profile.mobile_number

        expiry_secs = getattr(settings, 'OTP_EXPIRY_SECONDS', 300)
        cooldown_secs = getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 30)
        max_attempts = getattr(settings, 'OTP_MAX_ATTEMPTS', 3)

        return Response({
            "success": True,
            "message": "Google identity verified. Please enter the verification OTP sent to your registered email address.",
            "auth_state": "PENDING_MFA",
            "status": "OTP_REQUIRED",
            "challenge_id": pre_auth_token,
            "pre_auth_token": pre_auth_token,
            "email": user.email,
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": expiry_secs,
            "cooldown_seconds": cooldown_secs,
            "max_attempts": max_attempts,
            "mfa_required": True,
            "destination": {
                "masked_email": mask_email(user.email)
            }
        }, status=status.HTTP_200_OK)


# -----------------------------------------------------------------------------
# Module 4: Email Verification & Resend Endpoints
# -----------------------------------------------------------------------------

class ResendVerificationThrottle(AnonRateThrottle):
    """
    Throttles email resend requests to 3 per minute.
    """
    rate = '3/minute'


class VerifyEmailView(APIView):
    """
    POST /api/auth/verify-email/
    Module 4: Email Verification Endpoint.
    - Accepts 64-char URL token OR { email, otp_code }.
    - On OTP code: verifies against OTPVerification (purpose='EMAIL_VERIFICATION').
    - On link token: verifies against EmailVerificationToken.
    - On success: marks record used, updates authoritative fields:
      user.email_verified = True
      user.account_status = 'ACTIVE'
    - Invalidates both link token and OTP records for this user upon success.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hashlib
        import hmac
        from django.contrib.auth.hashers import check_password
        from django.utils import timezone
        from authentication.models import EmailVerificationToken, OTPVerification
        from accounts.serializers import VerifyEmailSerializer

        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "code": "INVALID_TOKEN",
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        raw_token = serializer.validated_data.get('token', '').strip()
        raw_email = serializer.validated_data.get('email', '').strip().lower()
        raw_otp = serializer.validated_data.get('otp_code', '').strip()

        # CASE A: OTP Verification via Email + 6-digit Code
        if raw_email and raw_otp:
            user = User.objects.filter(email__iexact=raw_email).first()
            if not user:
                return Response({
                    "success": False,
                    "code": "USER_NOT_FOUND",
                    "message": "No account found with this email address."
                }, status=status.HTTP_404_NOT_FOUND)

            is_verified = bool(user.email_verified or user.account_status == 'ACTIVE')
            if is_verified:
                if not user.email_verified or user.account_status != 'ACTIVE':
                    user.email_verified = True
                    if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                        user.account_status = 'ACTIVE'
                    user.save(update_fields=['email_verified', 'account_status'])
                return Response({
                    "success": True,
                    "code": "ALREADY_VERIFIED",
                    "message": "Your email address is already verified. You may proceed to log in.",
                    "email_verified": True
                }, status=status.HTTP_200_OK)

            otp_record = OTPVerification.objects.filter(
                user=user,
                purpose='EMAIL_VERIFICATION',
                used=False
            ).order_by('-created_at').first()

            if not otp_record:
                return Response({
                    "success": False,
                    "code": "NO_ACTIVE_OTP",
                    "message": "No active verification code found for this email. Please request a new code."
                }, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.expires_at < timezone.now():
                return Response({
                    "success": False,
                    "code": "OTP_EXPIRED",
                    "message": "The verification code has expired. Please request a new code."
                }, status=status.HTTP_400_BAD_REQUEST)

            if otp_record.attempt_count >= otp_record.max_attempts:
                otp_record.used = True
                otp_record.save(update_fields=['used'])
                return Response({
                    "success": False,
                    "code": "MAX_ATTEMPTS_EXCEEDED",
                    "message": "Too many failed attempts. Please request a new verification code."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Constant-time verify against hash (SHA-256 or PBKDF2 check_password)
            submitted_hash = hashlib.sha256(raw_otp.encode()).hexdigest()
            is_match = (
                hmac.compare_digest(otp_record.code_hash, submitted_hash) or
                check_password(raw_otp, otp_record.code_hash)
            )

            if not is_match:
                otp_record.attempt_count += 1
                otp_record.save(update_fields=['attempt_count'])
                remaining = max(0, otp_record.max_attempts - otp_record.attempt_count)
                return Response({
                    "success": False,
                    "code": "INVALID_OTP",
                    "message": f"Invalid verification code. {remaining} attempt(s) remaining.",
                    "attempts_remaining": remaining
                }, status=status.HTTP_400_BAD_REQUEST)

            # Valid OTP -> Update database atomically
            with transaction.atomic():
                otp_record.used = True
                otp_record.save(update_fields=['used'])

                # Invalidate all unused tokens and OTPs for this user
                EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
                OTPVerification.objects.filter(user=user, purpose='EMAIL_VERIFICATION', used=False).update(used=True)

                user.email_verified = True
                if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                    user.account_status = 'ACTIVE'
                user.save(update_fields=['email_verified', 'account_status'])

            logger.info("Email verified successfully via OTP for user: %s", user.email)

            return Response({
                "success": True,
                "code": "EMAIL_VERIFIED",
                "message": "Email address verified successfully. Your citizen account is now active. You may proceed to log in.",
                "email": user.email,
                "email_verified": True
            }, status=status.HTTP_200_OK)

        # CASE B: Link Token Verification
        if raw_token:
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            token_record = EmailVerificationToken.objects.filter(token_hash=token_hash).select_related('user').first()

            if not token_record:
                return Response({
                    "success": False,
                    "code": "INVALID_TOKEN",
                    "message": "Invalid verification link. Please check your email or request a new activation link."
                }, status=status.HTTP_400_BAD_REQUEST)

            user = token_record.user

            if token_record.used:
                is_verified = bool(user.email_verified or user.account_status == 'ACTIVE')
                if is_verified:
                    if not user.email_verified or user.account_status != 'ACTIVE':
                        user.email_verified = True
                        if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                            user.account_status = 'ACTIVE'
                        user.save(update_fields=['email_verified', 'account_status'])
                    return Response({
                        "success": True,
                        "code": "ALREADY_VERIFIED",
                        "message": "Your email address is already verified. You may proceed to log in.",
                        "email_verified": True
                    }, status=status.HTTP_200_OK)
                return Response({
                    "success": False,
                    "code": "ALREADY_USED",
                    "message": "This verification link has already been used. Please request a new one if your account is not active."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check expiration
            if token_record.expires_at < timezone.now():
                return Response({
                    "success": False,
                    "code": "TOKEN_EXPIRED",
                    "message": "This verification link has expired (valid for 24 hours). Please request a new link below."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Activate user account atomically
            with transaction.atomic():
                token_record.used = True
                token_record.save(update_fields=['used'])

                # Invalidate active email OTPs as well
                OTPVerification.objects.filter(user=user, purpose='EMAIL_VERIFICATION', used=False).update(used=True)

                user.email_verified = True
                if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                    user.account_status = 'ACTIVE'
                user.save(update_fields=['email_verified', 'account_status'])

            logger.info("Email verified successfully via token link for user: %s", user.email)

            return Response({
                "success": True,
                "code": "EMAIL_VERIFIED",
                "message": "Email address verified successfully. Your citizen account is now active. You may proceed to log in.",
                "email": user.email,
                "email_verified": True
            }, status=status.HTTP_200_OK)

        return Response({
            "success": False,
            "code": "INVALID_REQUEST",
            "message": "Please provide a valid verification link token or email with verification code."
        }, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """
    POST /api/auth/resend-verification/
    Module 4: Resend Verification Email/OTP Endpoint.
    - Accepts email.
    - Enforces 60-second cooldown server-side per email.
    - Timing-safe: non-existent emails execute equivalent dummy hash work to prevent user enumeration.
    - Invalidates prior tokens and dispatches fresh verification OTP and link.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        from django.core.cache import cache
        from django.contrib.auth.hashers import check_password
        from accounts.serializers import ResendVerificationSerializer
        from accounts.utils import generate_and_send_verification_email

        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Please provide a valid email address."
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        cooldown_key = f"resend_email_cooldown_{email}"

        # 1. Enforce 60-second cooldown
        if cache.get(cooldown_key):
            return Response({
                "success": False,
                "code": "COOLDOWN_ACTIVE",
                "message": "Please wait before requesting another verification email."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        user = User.objects.filter(email__iexact=email).first()

        # 2. Timing-safe non-existent user handling
        if not user:
            # Perform exact same hashing CPU work
            check_password("dummy_password", DUMMY_PASSWORD_HASH)
            return Response({
                "success": True,
                "message": "If an account with this email exists, a fresh verification code has been sent."
            }, status=status.HTTP_200_OK)

        # If already verified
        is_verified = bool(user.email_verified or user.account_status == 'ACTIVE')
        if is_verified:
            if not user.email_verified or user.account_status != 'ACTIVE':
                user.email_verified = True
                if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                    user.account_status = 'ACTIVE'
                user.save(update_fields=['email_verified', 'account_status'])
            return Response({
                "success": True,
                "code": "ALREADY_VERIFIED",
                "message": "This email address is already verified. You may proceed to log in."
            }, status=status.HTTP_200_OK)

        # Dispatch fresh verification email and set 60s cooldown
        generate_and_send_verification_email(user, request)
        cache.set(cooldown_key, True, timeout=60)

        return Response({
            "success": True,
            "message": "If an account with this email exists, a fresh verification code has been sent.",
            "email": user.email,
            "expires_in_seconds": 300,
            "cooldown_seconds": 60
        }, status=status.HTTP_200_OK)


# -----------------------------------------------------------------------------
# Module 5: OTP Authentication & MFA Gateway
# -----------------------------------------------------------------------------

def validate_and_decode_pre_auth_token(token_str):
    """
    Validates pre-auth JWT token:
    - Signature valid with SECRET_KEY
    - Not expired (5-minute window)
    - token_type == 'pre_auth'
    - state == 'PENDING_MFA'
    - Not consumed / single-use check in cache
    Returns (user, payload) or raises ValidationError/AuthenticationFailed.
    """
    import jwt
    from django.core.cache import cache
    from rest_framework.exceptions import AuthenticationFailed

    signing_key = getattr(settings, 'SECRET_KEY', 'digivote-secret')
    try:
        payload = jwt.decode(token_str, signing_key, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Authentication session expired (5-minute limit). Please log in again.", code="PRE_AUTH_EXPIRED")
    except Exception as e:
        raise AuthenticationFailed("Invalid authentication token. Please log in again.", code="INVALID_PRE_AUTH")

    if payload.get('token_type') != 'pre_auth' or payload.get('state') != 'PENDING_MFA':
        raise AuthenticationFailed("Unauthorized token type for MFA verification.", code="INVALID_TOKEN_SCOPE")

    token_jti = payload.get('user_id') + "_" + str(payload.get('iat'))
    if cache.get(f"consumed_pre_auth_{token_jti}"):
        raise AuthenticationFailed("This authentication session has already been completed or invalidated. Please log in again.", code="PRE_AUTH_REUSED")

    user_id = payload.get('user_id')
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise AuthenticationFailed("User associated with session not found.", code="USER_NOT_FOUND")

    return user, payload, token_jti


class SendOTPView(APIView):
    """
    POST /api/auth/otp/send/
    Module 5: Request 6-digit OTP code using pre-auth token.
    - Validates pre-auth token.
    - Enforces 30-second cooldown and max 3 sends per pre-auth session.
    - Dispatches 6-digit OTP via email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.core.cache import cache
        from rest_framework.exceptions import AuthenticationFailed
        from accounts.serializers import SendOTPSerializer
        from accounts.utils import generate_and_send_otp_email

        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Pre-authentication token is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        pre_auth_token = serializer.validated_data['pre_auth_token']

        try:
            user, payload, token_jti = validate_and_decode_pre_auth_token(pre_auth_token)
        except AuthenticationFailed as af:
            return Response({
                "success": False,
                "code": af.get_codes() if hasattr(af, 'get_codes') else "AUTH_FAILED",
                "message": str(af.detail)
            }, status=status.HTTP_401_UNAUTHORIZED)

        cooldown_key = f"otp_cooldown_{token_jti}"
        count_key = f"otp_send_count_{token_jti}"

        # 30-second cooldown
        if cache.get(cooldown_key):
            return Response({
                "success": False,
                "code": "COOLDOWN_ACTIVE",
                "message": "Please wait 30 seconds before requesting another code."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Max 3 sends per pre-auth session
        send_count = cache.get(count_key, 0)
        if send_count >= 3:
            return Response({
                "success": False,
                "code": "MAX_SENDS_EXCEEDED",
                "message": "Maximum OTP resend limit reached for this session. Please log in again."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Dispatch OTP
        otp_info = generate_and_send_otp_email(user, request)
        cache.set(cooldown_key, True, timeout=30)
        cache.set(count_key, send_count + 1, timeout=300)

        mobile_num = getattr(user, 'phone_number', None)
        if not mobile_num and hasattr(user, 'user_profile'):
            mobile_num = user.user_profile.mobile_number

        return Response({
            "success": True,
            "message": "Security verification code sent to your registered contact.",
            "destination": {
                "masked_email": mask_email(user.email),
                "masked_mobile": mask_mobile(mobile_num)
            },
            "expires_in_seconds": 300,
            "cooldown_seconds": 30
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """
    POST /api/auth/otp/verify/
    Module 5: Submit 6-digit OTP code to complete MFA authentication.
    - Validates pre-auth token.
    - Hashes submitted code and performs constant-time compare against active OTPCode.code_hash.
    - Enforces max 5 attempts before locking session.
    - On success: marks OTPCode.used=True, invalidates pre-auth token (single-use),
      issues full SimpleJWT session tokens (access + refresh), and logs LoginAttempt(mfa_completed=True).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hmac
        import hashlib
        from django.utils import timezone
        from django.core.cache import cache
        from rest_framework.exceptions import AuthenticationFailed
        from rest_framework_simplejwt.tokens import RefreshToken
        from authentication.models import OTPCode, LoginAttempt
        from accounts.serializers import VerifyOTPSerializer

        # Seamless routing: if email and otp_code/otp are provided without pre_auth_token,
        # delegate to email verification handler so verify-otp works across all callers.
        raw_email = (request.data.get('email') or request.data.get('username') or '').strip()
        has_otp = bool(request.data.get('otp_code') or request.data.get('otp'))
        has_pre_auth = bool(request.data.get('pre_auth_token') or request.data.get('challenge_id'))
        if raw_email and has_otp and not has_pre_auth:
            return VerifyEmailView().post(request)

        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "field": first_field,
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        pre_auth_token = serializer.validated_data['pre_auth_token']
        submitted_otp = serializer.validated_data['otp_code'].strip()

        try:
            user, payload, token_jti = validate_and_decode_pre_auth_token(pre_auth_token)
        except AuthenticationFailed as af:
            return Response({
                "success": False,
                "code": af.get_codes() if hasattr(af, 'get_codes') else "AUTH_FAILED",
                "message": str(af.detail)
            }, status=status.HTTP_401_UNAUTHORIZED)

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Lookup active OTP record for this user
        otp_record = OTPCode.objects.filter(user=user, used=False).order_by('-created_at').first()

        if not otp_record:
            return Response({
                "success": False,
                "code": "NO_ACTIVE_OTP",
                "message": "No active verification code found. Please request a new code."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check expiration
        if otp_record.expires_at < timezone.now():
            return Response({
                "success": False,
                "code": "OTP_EXPIRED",
                "message": "The verification code has expired (codes are valid for 5 minutes). Please request a new one."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check maximum attempts (5 max)
        if otp_record.attempt_count >= otp_record.max_attempts:
            # Invalidate OTP and burn session
            otp_record.used = True
            otp_record.save(update_fields=['used'])
            cache.set(f"consumed_pre_auth_{token_jti}", True, timeout=300)

            LoginAttempt.objects.create(
                user=user,
                email_attempted=user.email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="OTP_MAX_ATTEMPTS_EXCEEDED"
            )

            return Response({
                "success": False,
                "code": "MAX_ATTEMPTS_EXCEEDED",
                "message": "Too many incorrect attempts. For security, your session has been closed. Please log in again."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Constant-time hash verification
        submitted_hash = hashlib.sha256(submitted_otp.encode()).hexdigest()
        is_match = hmac.compare_digest(otp_record.code_hash, submitted_hash)

        if not is_match:
            # Increment attempt count
            otp_record.attempt_count += 1
            otp_record.save(update_fields=['attempt_count'])

            remaining_attempts = max(0, otp_record.max_attempts - otp_record.attempt_count)

            if remaining_attempts == 0:
                otp_record.used = True
                otp_record.save(update_fields=['used'])
                cache.set(f"consumed_pre_auth_{token_jti}", True, timeout=300)

                return Response({
                    "success": False,
                    "code": "MAX_ATTEMPTS_EXCEEDED",
                    "message": "Too many incorrect attempts. Please log in again."
                }, status=status.HTTP_401_UNAUTHORIZED)

            return Response({
                "success": False,
                "code": "INVALID_OTP",
                "message": f"Invalid verification code. {remaining_attempts} attempts remaining.",
                "attempts_remaining": remaining_attempts
            }, status=status.HTTP_400_BAD_REQUEST)

        # OTP Matches! Complete Full MFA Session & Create UserSession (Module 6)
        with transaction.atomic():
            otp_record.used = True
            otp_record.save(update_fields=['used'])

            # Invalidate pre-auth token (enforce single-use)
            cache.set(f"consumed_pre_auth_{token_jti}", True, timeout=300)

            # Ensure authoritative verification fields are set
            user_updated = False
            if not user.email_verified:
                user.email_verified = True
                user_updated = True
            if user.account_status == 'PENDING_EMAIL_VERIFICATION':
                user.account_status = 'ACTIVE'
                user_updated = True
            if user_updated:
                user.save(update_fields=['email_verified', 'account_status'])

            # Issue SimpleJWT full session tokens
            refresh = RefreshToken.for_user(user)
            refresh_jti = refresh['jti']

            # Parse device label from user agent
            device_label = "Unknown Browser"
            ua_lower = user_agent.lower()
            if "edg/" in ua_lower:
                device_label = "Microsoft Edge"
            elif "chrome/" in ua_lower and "safari/" in ua_lower:
                device_label = "Google Chrome"
            elif "firefox/" in ua_lower:
                device_label = "Mozilla Firefox"
            elif "safari/" in ua_lower:
                device_label = "Apple Safari"
            
            if "windows" in ua_lower:
                device_label += " on Windows"
            elif "macintosh" in ua_lower or "mac os" in ua_lower:
                device_label += " on macOS"
            elif "linux" in ua_lower:
                device_label += " on Linux"
            elif "android" in ua_lower:
                device_label += " on Android"
            elif "iphone" in ua_lower or "ipad" in ua_lower:
                device_label += " on iOS"

            from authentication.models import UserSession
            session_expiry = timezone.now() + timedelta(days=7)

            user_session = UserSession.objects.create(
                user=user,
                refresh_token_jti=refresh_jti,
                device_label=device_label,
                ip_address=ip_address,
                user_agent=user_agent,
                expires_at=session_expiry,
                revoked=False
            )

            # Attach session_id claim to both refresh and access tokens
            refresh['session_id'] = str(user_session.id)
            access = refresh.access_token
            access['session_id'] = str(user_session.id)

            access_token = str(access)
            refresh_token = str(refresh)

            # Audit login attempt with MFA completed
            LoginAttempt.objects.create(
                user=user,
                email_attempted=user.email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=True,
                mfa_completed=True,
                failure_reason=None
            )

        full_name = getattr(user, 'first_name', '') or user.username
        mobile_num = getattr(user, 'phone_number', '')
        if hasattr(user, 'user_profile') and user.user_profile.full_name:
            full_name = user.user_profile.full_name
            mobile_num = user.user_profile.mobile_number or mobile_num

        return Response({
            "success": True,
            "message": "Multi-Factor Authentication verified successfully. Welcome to DigiVote.",
            "auth_state": "AUTHENTICATED",
            "tokens": {
                "access": access_token,
                "refresh": refresh_token,
                "token_type": "Bearer",
                "session_id": str(user_session.id)
            },
            "user": {
                "id": str(user.id),
                "full_name": full_name,
                "email": user.email,
                "mobile_number": mobile_num,
                "role": getattr(user, 'role', 'VOTER'),
                "account_status": user.account_status,
                "is_email_verified": user.email_verified
            }
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """
    POST /api/auth/otp/resend/
    Module 5: Resend fresh 6-digit OTP code using pre-auth token or email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_email = (request.data.get('email') or request.data.get('username') or '').strip()
        has_pre_auth = bool(request.data.get('pre_auth_token') or request.data.get('challenge_id'))
        if raw_email and not has_pre_auth:
            return ResendVerificationView().post(request)
        # Delegates to SendOTPView logic
        return SendOTPView().post(request)


# -----------------------------------------------------------------------------
# Module 6: Session Management & Revocation Endpoints
# -----------------------------------------------------------------------------

class SessionListView(APIView):
    """
    GET /api/auth/sessions/
    Module 6: List active (non-revoked, non-expired) sessions for authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from authentication.models import UserSession
        from accounts.serializers import UserSessionSerializer

        now = timezone.now()
        sessions = UserSession.objects.filter(
            user=request.user,
            revoked=False,
            expires_at__gt=now
        ).order_by('-last_active_at')

        serializer = UserSessionSerializer(sessions, many=True, context={'request': request})
        return Response({
            "success": True,
            "count": len(sessions),
            "sessions": serializer.data
        }, status=status.HTTP_200_OK)


class SessionRevokeView(APIView):
    """
    DELETE /api/auth/sessions/<uuid:session_id>/
    Module 6: Revoke a specific active session.
    - Ensures user can only revoke their OWN session (403 on cross-user attempt).
    - Sets revoked=True and revoked_at=now().
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, session_id):
        from authentication.models import UserSession
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        session = UserSession.objects.filter(id=session_id).first()
        if not session:
            return Response({
                "success": False,
                "message": "Session not found."
            }, status=status.HTTP_404_NOT_FOUND)

        if session.user != request.user:
            return Response({
                "success": False,
                "message": "You do not have permission to revoke this session."
            }, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        session.revoked = True
        session.revoked_at = now
        session.save(update_fields=['revoked', 'revoked_at'])

        # Blacklist the refresh token if found in OutstandingToken table
        try:
            outstanding = OutstandingToken.objects.filter(jti=session.refresh_token_jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception as e:
            logger.warning("Could not blacklist token on session revoke: %s", e)

        current_session = getattr(request, 'user_session', None)
        is_current = bool(current_session and current_session.id == session.id)

        return Response({
            "success": True,
            "message": "Session revoked successfully.",
            "is_current_session": is_current
        }, status=status.HTTP_200_OK)

    def post(self, request, session_id):
        return self.delete(request, session_id)



class RevokeAllSessionsView(APIView):
    """
    POST /api/auth/sessions/revoke-all/
    Module 6: Revoke all sessions for authenticated user.
    - Optional keep_current: bool (default False).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from authentication.models import UserSession
        from accounts.serializers import RevokeAllSessionsSerializer
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        serializer = RevokeAllSessionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        keep_current = serializer.validated_data.get('keep_current', False)

        now = timezone.now()
        current_session = getattr(request, 'user_session', None)

        sessions_query = UserSession.objects.filter(user=request.user, revoked=False)
        if keep_current and current_session:
            sessions_query = sessions_query.exclude(id=current_session.id)

        revoked_jtis = list(sessions_query.values_list('refresh_token_jti', flat=True))
        count = sessions_query.update(revoked=True, revoked_at=now)

        # Blacklist revoked refresh tokens
        try:
            outstandings = OutstandingToken.objects.filter(jti__in=revoked_jtis)
            for out in outstandings:
                BlacklistedToken.objects.get_or_create(token=out)
        except Exception as e:
            logger.warning("Could not blacklist tokens on revoke-all: %s", e)

        return Response({
            "success": True,
            "message": f"Successfully revoked {count} session(s).",
            "revoked_count": count,
            "current_session_preserved": bool(keep_current and current_session)
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Module 6: Logout current device session.
    - Revokes current UserSession.
    - Blacklists refresh token if provided in request body.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from authentication.models import UserSession
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        current_session = getattr(request, 'user_session', None)
        if current_session:
            current_session.revoked = True
            current_session.revoked_at = timezone.now()
            current_session.save(update_fields=['revoked', 'revoked_at'])

        # Blacklist provided refresh token
        raw_refresh = request.data.get('refresh')
        if raw_refresh:
            try:
                token = RefreshToken(raw_refresh)
                token.blacklist()
            except Exception as e:
                logger.warning("Could not blacklist refresh token during logout: %s", e)

        return Response({
            "success": True,
            "message": "Successfully logged out from this device."
        }, status=status.HTTP_200_OK)


# -----------------------------------------------------------------------------
# Module 7: Security Audit & Admin Governance Endpoints
# -----------------------------------------------------------------------------

class SecurityEventListView(APIView):
    """
    GET /api/admin/security-events/
    Module 7: List security events (admin-only).
    - Filterable by event_type, email query, and date window.
    - Includes summary statistics (locked count, throttle count, suspicious patterns).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from authentication.models import SecurityEvent, User
        from accounts.serializers import SecurityEventSerializer
        from accounts.permissions import IsElectionAdminUser

        # Verify admin permission
        if not IsElectionAdminUser().has_permission(request, self):
            return Response({
                "success": False,
                "message": "Administrative credentials required to view security audit logs."
            }, status=status.HTTP_403_FORBIDDEN)

        event_type = request.query_params.get('event_type')
        email = request.query_params.get('email')

        events_qs = SecurityEvent.objects.all().select_related('user').order_by('-created_at')

        if event_type:
            events_qs = events_qs.filter(event_type=event_type)
        if email:
            events_qs = events_qs.filter(user__email__icontains=email)

        events = events_qs[:100] # Cap at 100 most recent
        serializer = SecurityEventSerializer(events, many=True)

        now = timezone.now()
        day_ago = now - timedelta(hours=24)
        week_ago = now - timedelta(days=7)

        stats = {
            'locked_accounts_24h': SecurityEvent.objects.filter(event_type='account_locked', created_at__gte=day_ago).count(),
            'ip_throttles_24h': SecurityEvent.objects.filter(event_type='ip_throttled', created_at__gte=day_ago).count(),
            'suspicious_patterns_7d': SecurityEvent.objects.filter(event_type='suspicious_pattern', created_at__gte=week_ago).count(),
            'total_locked_users': User.objects.filter(account_status='LOCKED').count()
        }

        return Response({
            "success": True,
            "stats": stats,
            "count": len(events),
            "events": serializer.data
        }, status=status.HTTP_200_OK)


class AdminUnlockUserView(APIView):
    """
    POST /api/admin/users/<uuid:user_id>/unlock/
    Module 7: Manually unlock a locked user account (admin-only).
    - Resets account_status to ACTIVE and failed_login_count to 0.
    - Logs SecurityEvent(event_type='manual_unlock').
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        from authentication.models import User, SecurityEvent
        from accounts.permissions import IsElectionAdminUser

        # Verify admin permission
        if not IsElectionAdminUser().has_permission(request, self):
            return Response({
                "success": False,
                "message": "Administrative credentials required to unlock user accounts."
            }, status=status.HTTP_403_FORBIDDEN)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({
                "success": False,
                "message": "User not found."
            }, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            user.account_status = 'ACTIVE'
            user.failed_login_count = 0
            user.locked_at = None
            user.locked_until = None
            user.save(update_fields=['account_status', 'failed_login_count', 'locked_at', 'locked_until'])

            ip_address = get_client_ip(request)
            SecurityEvent.objects.create(
                user=user,
                event_type='manual_unlock',
                ip_address=ip_address,
                metadata={
                    'unlocked_by_admin_id': str(request.user.id),
                    'unlocked_by_admin_email': request.user.email
                }
            )

        return Response({
            "success": True,
            "message": f"User {user.email} has been manually unlocked and restored to ACTIVE status."
        }, status=status.HTTP_200_OK)


class UserSecurityActivityView(APIView):
    """
    GET /api/auth/security-activity/
    Module 7: Voter-facing security & activity audit.
    Returns recent login attempts and session events for the requesting authenticated citizen.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from authentication.models import LoginAttempt
        user = request.user
        attempts = LoginAttempt.objects.filter(
            models.Q(user=user) | models.Q(email_attempted=user.email)
        ).order_by('-timestamp')[:10]

        logs = []
        for att in attempts:
            is_ok = getattr(att, 'success', False)
            status_desc = "Successful authentication" if is_ok else f"Failed attempt: {att.failure_reason or 'Invalid credentials'}"
            if getattr(att, 'mfa_completed', False):
                status_desc += " (MFA cleared)"
            logs.append({
                "id": str(att.id),
                "title": f"Login {'Success' if is_ok else 'Alert'}",
                "description": f"{status_desc} from IP {att.ip_address or 'Unknown'}",
                "timestamp": att.timestamp.strftime("%b %d, %Y %H:%M") if hasattr(att, 'timestamp') and att.timestamp else "Recently",
                "type": "auth" if is_ok else "warning",
                "ip_address": att.ip_address,
                "user_agent": att.user_agent,
            })
        return Response({"logs": logs}, status=status.HTTP_200_OK)


# -----------------------------------------------------------------------------
# Password Reset Module & Profile Identification
# -----------------------------------------------------------------------------

class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/ or /api/auth/password-reset/request/
    Initiates password reset flow.
    Enforces rate throttling and timing-safe responses to prevent email enumeration.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        from accounts.serializers import PasswordResetRequestSerializer
        from accounts.utils import generate_and_send_password_reset_email
        from django.contrib.auth.hashers import check_password
        from authentication.models import SecurityEvent

        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Please provide a valid email address."
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        # Timing safety: perform dummy work if user doesn't exist
        if not user:
            check_password("dummy_password", DUMMY_PASSWORD_HASH)
            return Response({
                "success": True,
                "message": "If an account with this email exists, a password reset email has been sent."
            }, status=status.HTTP_200_OK)

        # Dispatch reset email
        generate_and_send_password_reset_email(user, request)

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        SecurityEvent.objects.create(
            user=user,
            event_type='suspicious_pattern',
            ip_address=ip_address,
            metadata={'action': 'password_reset_requested', 'user_agent': user_agent}
        )

        return Response({
            "success": True,
            "message": "If an account with this email exists, a password reset email has been sent."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/ or /api/auth/password-reset/confirm/
    Validates single-use reset token and sets new password.
    CRITICAL SECURITY REQUIREMENT:
    Immediately revokes all existing active sessions for this user and blacklists tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hashlib
        from django.utils import timezone
        from authentication.models import PasswordResetToken, UserSession, SecurityEvent
        from accounts.serializers import PasswordResetConfirmSerializer
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "field": first_field,
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        raw_token = serializer.validated_data['token'].strip()
        new_password = serializer.validated_data['password']

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        token_record = PasswordResetToken.objects.filter(token_hash=token_hash).select_related('user').first()

        if not token_record:
            return Response({
                "success": False,
                "code": "INVALID_TOKEN",
                "message": "Password reset link is invalid or does not exist."
            }, status=status.HTTP_400_BAD_REQUEST)

        if token_record.used:
            return Response({
                "success": False,
                "code": "ALREADY_USED",
                "message": "This password reset link has already been used. Please request a new one."
            }, status=status.HTTP_400_BAD_REQUEST)

        if token_record.expires_at < timezone.now():
            return Response({
                "success": False,
                "code": "TOKEN_EXPIRED",
                "message": "This password reset link has expired. Please request a fresh one."
            }, status=status.HTTP_400_BAD_REQUEST)

        user = token_record.user
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        with transaction.atomic():
            # 1. Update password securely using Django's hasher
            user.set_password(new_password)
            # Reset any failed login lockout
            user.failed_login_count = 0
            user.locked_at = None
            user.locked_until = None
            if user.account_status == 'LOCKED':
                user.account_status = 'ACTIVE'
            user.save()

            # 2. Mark token as consumed
            token_record.used = True
            token_record.save(update_fields=['used'])

            # 3. CRITICAL SECURITY RULE: Invalidate all active sessions
            now = timezone.now()
            active_sessions = UserSession.objects.filter(user=user, revoked=False)
            revoked_jtis = list(active_sessions.values_list('refresh_token_jti', flat=True))
            revoked_count = active_sessions.update(revoked=True, revoked_at=now)

            # 4. Blacklist all outstanding refresh tokens
            try:
                outstandings = OutstandingToken.objects.filter(jti__in=revoked_jtis)
                for out in outstandings:
                    BlacklistedToken.objects.get_or_create(token=out)
            except Exception as e:
                logger.warning("Could not blacklist tokens on password reset: %s", e)

            # 5. Security audit logging
            SecurityEvent.objects.create(
                user=user,
                event_type='manual_unlock',
                ip_address=ip_address,
                metadata={
                    'action': 'password_reset_completed',
                    'revoked_sessions_count': revoked_count,
                    'user_agent': user_agent
                }
            )

        return Response({
            "success": True,
            "message": "Password updated successfully. All existing sessions have been signed out for security. Please sign in with your new password."
        }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns sanitized identity, role, and profile of authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        full_name = getattr(user, 'first_name', '') or user.username
        mobile_num = getattr(user, 'phone_number', '')
        if hasattr(user, 'user_profile') and user.user_profile:
            full_name = user.user_profile.full_name or full_name
            mobile_num = user.user_profile.mobile_number or mobile_num

        voter_profile_data = None
        if hasattr(user, 'voter_profile') and user.voter_profile:
            try:
                from voters.serializers import VoterProfileSerializer
                voter_profile_data = VoterProfileSerializer(user.voter_profile).data
            except Exception:
                pass

        user_data = {
            "id": str(user.id),
            "full_name": full_name,
            "name": full_name,
            "email": user.email,
            "mobile_number": mobile_num,
            "role": getattr(user, 'role', 'VOTER'),
            "status": getattr(user, 'account_status', 'ACTIVE'),
            "account_status": getattr(user, 'account_status', 'ACTIVE'),
            "is_email_verified": getattr(user, 'email_verified', True),
            "email_verified": getattr(user, 'email_verified', True),
            "is_staff": user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'ELECTION_CREATOR'],
            "is_superuser": user.is_superuser,
            "date_joined": user.date_joined.isoformat() if hasattr(user, 'date_joined') and user.date_joined else None
        }

        return Response({
            "success": True,
            "user": user_data,
            "data": {
                "user": user_data,
                "voter_profile": voter_profile_data
            },
            "voter_profile": voter_profile_data
        }, status=status.HTTP_200_OK)







