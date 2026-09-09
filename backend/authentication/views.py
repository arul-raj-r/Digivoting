import random
import secrets
import hashlib
import string
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import transaction, IntegrityError, models
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from authentication.models import User, UserProfile, OTPVerification, EmailVerificationToken, PasswordResetToken
from security.models import Device, Session, SecurityEvent
from audit.models import AuditLog
from voters.models import VoterProfile
from authentication.serializers import LoginSerializer, OTPVerifySerializer, UserSerializer
from authentication.utils import log_event
from authentication.services.email_service import EmailService

# Throttles
class LoginThrottle(AnonRateThrottle):
    rate = '10/minute'

class ResendThrottle(AnonRateThrottle):
    rate = '3/minute'

# Consistent API Helper Formats
def api_success(data=None, status_code=200):
    return Response({
        "success": True,
        "data": data or {}
    }, status=status_code)

def api_error(code, message, status_code=400):
    return Response({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }, status=status_code)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# Helper to verify password requirements
def check_password_strength(password):
    try:
        validate_password(password)
        return None
    except ValidationError as e:
        return "; ".join(e.messages)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        password_confirmation = request.data.get('password_confirmation', '')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        mobile_number = request.data.get('mobile_number', '').strip()

        if not email or not password or not password_confirmation:
            return api_error("VALIDATION_ERROR", "Email, password and confirmation are required.")

        if password != password_confirmation:
            return api_error("PASSWORD_MISMATCH", "Passwords do not match.")

        strength_err = check_password_strength(password)
        if strength_err:
            return api_error("WEAK_PASSWORD", strength_err)

        if User.objects.filter(email=email).exists():
            return api_error("DUPLICATE_EMAIL", "An account with this email already exists.")

        try:
            with transaction.atomic():
                # Extract username from email or assign UUID
                username = email.split('@')[0]
                if User.objects.filter(username=username).exists():
                    username = f"{username}_{secrets.token_hex(3)}"

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.VOTER,
                    account_status='PENDING_EMAIL_VERIFICATION',
                    email_verified=False
                )
                
                # Update user profile with phone
                profile = user.user_profile
                profile.mobile_number = mobile_number
                profile.full_name = f"{first_name} {last_name}".strip() or username
                profile.save()

                # Generate email verification token
                token_val = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(token_val.encode()).hexdigest()
                expires_at = timezone.now() + timedelta(hours=24)

                EmailVerificationToken.objects.create(
                    user=user,
                    token_hash=token_hash,
                    expires_at=expires_at
                )

                # Send email
                EmailService.send_verification_email(email, token_val)
                
                log_event(user, 'ACCOUNT_CREATED', request, {'email': email})
                log_event(user, 'EMAIL_VERIFICATION_SENT', request, {'email': email})

            return api_success({
                "message": "Verification link sent to email address. Please confirm registration."
            }, status_code=status.HTTP_201_CREATED)

        except Exception as e:
            return api_error("REGISTRATION_FAILED", f"An error occurred: {str(e)}")


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_val = request.data.get('verification_token', '').strip()
        if not token_val:
            return api_error("INVALID_TOKEN", "Verification token is required.")

        token_hash = hashlib.sha256(token_val.encode()).hexdigest()
        token_record = EmailVerificationToken.objects.filter(token_hash=token_hash).first()

        if not token_record or token_record.used or token_record.expires_at < timezone.now():
            return api_error("INVALID_TOKEN", "Token is invalid, already used, or expired.")

        with transaction.atomic():
            token_record.used = True
            token_record.save()

            user = token_record.user
            user.email_verified = True
            user.account_status = 'ACTIVE'
            user.save()

            log_event(user, 'EMAIL_VERIFIED', request)

        return api_success({"message": "Email verified successfully"})


class ResendEmailVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return api_error("VALIDATION_ERROR", "Email field is required.")

        # Avoid account enumeration by always returning positive response
        user = User.objects.filter(email=email).first()
        if not user:
            return api_success({"message": "If the email exists, a new verification link has been sent."})

        # Cooldown check: prevent generating token if last was within 60s
        last_token = EmailVerificationToken.objects.filter(user=user).order_by('-created_at').first()
        if last_token and timezone.now() - last_token.created_at < timedelta(seconds=60):
            return api_error("COOLDOWN_ACTIVE", "Please wait before requesting another email.")

        with transaction.atomic():
            # Invalidate previous tokens
            EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

            # Generate new token
            token_val = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token_val.encode()).hexdigest()
            expires_at = timezone.now() + timedelta(hours=24)

            EmailVerificationToken.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=expires_at
            )

            # Send Email
            EmailService.send_verification_email(email, token_val)
            log_event(user, 'EMAIL_VERIFICATION_SENT', request)

        return api_success({"message": "If the email exists, a new verification link has been sent."})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # Dual-login backend resolves username or email
        user = authenticate(username=username, password=password)
        ip = get_client_ip(request)
        
        if not user:
            # Audit log failed login
            try:
                if '@' in username:
                    failed_user = User.objects.get(email=username)
                else:
                    failed_user = User.objects.get(username=username)
            except User.DoesNotExist:
                failed_user = None
            
            # Log failed security event
            SecurityEvent.objects.create(
                user=failed_user,
                event_type='FAILED_LOGIN',
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'attempted_username': username, 'reason': 'Invalid credentials'}
            )
            log_event(failed_user, 'LOGIN_FAILED', request, {'reason': 'Invalid credentials'}, severity='WARNING', result='FAILED')
            return api_error("INVALID_CREDENTIALS", "Invalid credentials. Please verify details and try again.")
            
        if user.account_status == 'PENDING_EMAIL_VERIFICATION':
            return api_error("EMAIL_VERIFICATION_REQUIRED", "Your email address is not verified yet. Please confirm your registration.")
            
        if user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
            SecurityEvent.objects.create(
                user=user,
                event_type='LOCKOUT',
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'reason': f"Account status is {user.account_status}"}
            )
            log_event(user, 'LOGIN_FAILED', request, {'reason': f"Account is {user.account_status}"}, severity='WARNING', result='FAILED')
            return api_error("ACCOUNT_INACTIVE", f"This account has been {user.account_status.lower()}. Please contact system support.")

        # Generate OTP Challenge
        otp_code = "123456" if getattr(settings, 'DEMO_MODE', True) else "".join(random.choices("0123456789", k=6))
        otp_code_hash = make_password(otp_code)
        
        otp_record = OTPVerification.objects.create(
            user=user,
            purpose='LOGIN',
            code_hash=otp_code_hash,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        # Send OTP via email
        try:
            EmailService.send_otp_email(user.email, otp_code)
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send OTP email: {e}", flush=True)
        
        # Log to console in Demo Mode
        if getattr(settings, 'DEMO_MODE', True):
            print(f"\n[DEMO OTP] Verification code for '{user.username}': {otp_code}\n", flush=True)
            
        log_event(user, 'OTP_SENT', request, {'challenge_id': str(otp_record.id)})
        
        return api_success({
            "status": "OTP_REQUIRED",
            "challenge_id": str(otp_record.id),
            "email": user.email
        })


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        challenge_id = request.data.get('challenge_id', '')
        otp = request.data.get('otp') or request.data.get('otp_code', '')
        
        if not challenge_id and request.data.get('username'):
            user_match = User.objects.filter(
                models.Q(username=request.data.get('username')) | models.Q(email=request.data.get('username'))
            ).first()
            if user_match:
                latest_otp = OTPVerification.objects.filter(user=user_match).order_by('-created_at').first()
                if latest_otp:
                    challenge_id = str(latest_otp.id)
        
        if not challenge_id or not otp:
            return api_error("VALIDATION_ERROR", "Challenge ID and OTP are required.")
            
        try:
            otp_record = OTPVerification.objects.get(id=challenge_id)
        except (OTPVerification.DoesNotExist, ValidationError):
            return api_error("INVALID_CHALLENGE", "The challenge reference is invalid.")
            
        user = otp_record.user
        
        # Lockout check
        if user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
            return api_error("ACCOUNT_INACTIVE", "Your account is locked or inactive.")
            
        if otp_record.used or otp_record.expires_at < timezone.now():
            log_event(user, 'OTP_EXPIRED', request, {'challenge_id': challenge_id}, severity='WARNING', result='FAILED')
            return api_error("OTP_EXPIRED", "The OTP code has expired or was already used.")
            
        if otp_record.attempt_count >= otp_record.max_attempts:
            otp_record.used = True
            otp_record.save()
            log_event(user, 'OTP_FAILED', request, {'reason': 'Max attempts reached'}, severity='WARNING', result='FAILED')
            return api_error("MAX_ATTEMPTS_EXCEEDED", "Maximum verification attempts reached. Please sign in again.")
            
        is_correct = check_password(otp, otp_record.code_hash)
        
        if not is_correct:
            otp_record.attempt_count += 1
            otp_record.save()
            
            remaining = otp_record.max_attempts - otp_record.attempt_count
            log_event(user, 'OTP_FAILED', request, {'remaining_attempts': remaining}, severity='WARNING', result='FAILED')
            
            if remaining <= 0:
                otp_record.used = True
                otp_record.save()
                return api_error("MAX_ATTEMPTS_EXCEEDED", "Incorrect code. Maximum attempts reached. Please login again.")
            return api_error("OTP_INCORRECT", f"Incorrect code. {remaining} attempt(s) remaining.")

        with transaction.atomic():
            # Mark OTP used
            otp_record.used = True
            otp_record.expires_at = timezone.now() - timedelta(seconds=1)
            otp_record.save()
            
            # Register active device and session
            user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown Browser')
            ip = get_client_ip(request)
            
            # Simple platform extraction
            platform = "Web App"
            if "windows" in user_agent.lower():
                platform = "Windows"
            elif "macintosh" in user_agent.lower():
                platform = "MacOS"
            elif "linux" in user_agent.lower():
                platform = "Linux"
            
            device, _ = Device.objects.get_or_create(
                user=user,
                device_name=user_agent[:150],
                defaults={'platform': platform}
            )
            
            sess = Session.objects.create(
                user=user,
                device=device,
                expires_at=timezone.now() + timedelta(days=7)
            )
            
            # Generate JWT Session
            refresh = RefreshToken.for_user(user)
            # Link session ID inside token payload (SimpleJWT token custom claim)
            refresh['session_id'] = str(sess.id)
            access_token = str(refresh.access_token)
            
            log_event(user, 'LOGIN_SUCCESS', request, {'session_id': str(sess.id)})
            log_event(user, 'SESSION_CREATED', request, {'session_id': str(sess.id)})
            
            voter_profile = None
            if user.role == User.VOTER and hasattr(user, 'voter_profile'):
                from voters.serializers import VoterProfileSerializer
                voter_profile = VoterProfileSerializer(user.voter_profile).data
                
            response = api_success({
                "access": access_token,
                "user": UserSerializer(user).data,
                "voter_profile": voter_profile
            })
            
            # HTTPOnly, Secure, SameSite refresh token cookie
            response.set_cookie(
                'refresh_token',
                str(refresh),
                httponly=True,
                secure=getattr(settings, 'SESSION_COOKIE_SECURE', True),
                samesite='Lax',
                max_age=60*60*24*7  # 7 days
            )
            
            return response


class OTPResendView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendThrottle]

    def post(self, request):
        challenge_id = request.data.get('challenge_id', '')
        if not challenge_id:
            return api_error("VALIDATION_ERROR", "Challenge ID is required.")
            
        try:
            prev_record = OTPVerification.objects.get(id=challenge_id)
        except (OTPVerification.DoesNotExist, ValidationError):
            return api_error("INVALID_CHALLENGE", "Challenge record not found.")
            
        user = prev_record.user
        
        # Check cooldown (60s minimum interval)
        if timezone.now() - prev_record.created_at < timedelta(seconds=60):
            return api_error("COOLDOWN_ACTIVE", "Please wait 60 seconds between OTP requests.")
            
        with transaction.atomic():
            # Invalidate old OTP
            prev_record.used = True
            prev_record.expires_at = timezone.now() - timedelta(seconds=1)
            prev_record.save()
            
            # Generate new OTP
            otp_code = "".join(random.choices("0123456789", k=6))
            otp_code_hash = make_password(otp_code)
            
            new_record = OTPVerification.objects.create(
                user=user,
                purpose='LOGIN',
                code_hash=otp_code_hash,
                expires_at=timezone.now() + timedelta(minutes=5)
            )
            
            # Send OTP via email
            try:
                EmailService.send_otp_email(user.email, otp_code)
            except Exception as e:
                print(f"[EMAIL ERROR] Failed to send OTP email: {e}", flush=True)
            
            if getattr(settings, 'DEMO_MODE', True):
                print(f"\n[DEMO OTP RESEND] Verification code for '{user.username}': {otp_code}\n")
                
            log_event(user, 'OTP_SENT', request, {'challenge_id': str(new_record.id)})
            
        return api_success({
            "challenge_id": str(new_record.id),
            "email": user.email
        })


class TokenRefreshCookieView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return api_error("REFRESH_TOKEN_MISSING", "Refresh token is missing.", 401)
        
        try:
            token = RefreshToken(refresh_token)
            user_id = token.payload.get('user_id')
            user = User.objects.get(id=user_id)
            
            if user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
                return api_error("ACCOUNT_INACTIVE", "Your account is locked or inactive.", 403)
                
            access_token = str(token.access_token)
            return api_success({"access": access_token})
        except Exception:
            return api_error("INVALID_TOKEN", "Refresh token is invalid or expired.", 401)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        
        # Try to revoke the specific session from token payload
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                session_id = token.payload.get('session_id')
                if session_id:
                    Session.objects.filter(id=session_id).update(revoked=True)
            except Exception:
                pass
                
        log_event(request.user, 'SESSION_REVOKED', request)
        
        response = api_success({"message": "Logout successful."})
        response.delete_cookie('refresh_token')
        return response


class LogoutAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Revoke all sessions
        Session.objects.filter(user=request.user).update(revoked=True)
        log_event(request.user, 'LOGOUT_ALL', request)
        
        response = api_success({"message": "Logged out from all devices."})
        response.delete_cookie('refresh_token')
        return response


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        voter_profile = None
        if user.role == User.VOTER and hasattr(user, 'voter_profile'):
            from voters.serializers import VoterProfileSerializer
            voter_profile = VoterProfileSerializer(user.voter_profile).data
            
        return api_success({
            "user": UserSerializer(user).data,
            "voter_profile": voter_profile
        })


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return api_error("VALIDATION_ERROR", "Email is required.")
            
        # Standard safety: prevent email account enumeration
        user = User.objects.filter(email=email).first()
        if not user:
            return api_success({"message": "If the email is registered, a password reset link has been sent."})
            
        with transaction.atomic():
            # Invalidate old reset tokens
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            
            # Create reset token
            token_val = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token_val.encode()).hexdigest()
            expires_at = timezone.now() + timedelta(hours=1)
            
            PasswordResetToken.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=expires_at
            )
            
            # Send Email
            EmailService.send_password_reset_email(email, token_val)
            log_event(user, 'PASSWORD_RESET_REQUESTED', request)
            
        return api_success({"message": "If the email is registered, a password reset link has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_val = request.data.get('reset_token', '').strip()
        password = request.data.get('password', '')
        password_confirmation = request.data.get('password_confirmation', '')
        
        if not token_val or not password or not password_confirmation:
            return api_error("VALIDATION_ERROR", "Token and passwords are required.")
            
        if password != password_confirmation:
            return api_error("PASSWORD_MISMATCH", "Passwords do not match.")
            
        strength_err = check_password_strength(password)
        if strength_err:
            return api_error("WEAK_PASSWORD", strength_err)
            
        token_hash = hashlib.sha256(token_val.encode()).hexdigest()
        token_record = PasswordResetToken.objects.filter(token_hash=token_hash).first()
        
        if not token_record or token_record.used or token_record.expires_at < timezone.now():
            return api_error("INVALID_TOKEN", "Reset token is invalid or expired.")
            
        with transaction.atomic():
            user = token_record.user
            user.set_password(password)
            user.save()
            
            # Mark token used
            token_record.used = True
            token_record.save()
            
            # Invalidate all active sessions for security
            Session.objects.filter(user=user).update(revoked=True)
            
            log_event(user, 'PASSWORD_RESET_COMPLETED', request)
            
        return api_success({"message": "Password reset successfully. Please log in with your new password."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        new_password_confirmation = request.data.get('new_password_confirmation', '')
        
        if not current_password or not new_password or not new_password_confirmation:
            return api_error("VALIDATION_ERROR", "Current and new passwords are required.")
            
        if new_password != new_password_confirmation:
            return api_error("PASSWORD_MISMATCH", "Passwords do not match.")
            
        user = request.user
        if not user.check_password(current_password):
            return api_error("INVALID_PASSWORD", "Incorrect current password.")
            
        strength_err = check_password_strength(new_password)
        if strength_err:
            return api_error("WEAK_PASSWORD", strength_err)
            
        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            
            # Revoke other sessions (except the current session ID in cookie)
            refresh_token = request.COOKIES.get('refresh_token')
            current_sess_id = None
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    current_sess_id = token.payload.get('session_id')
                except Exception:
                    pass
            
            sessions_query = Session.objects.filter(user=user)
            if current_sess_id:
                sessions_query = sessions_query.exclude(id=current_sess_id)
            sessions_query.update(revoked=True)
            
            log_event(user, 'PASSWORD_CHANGED', request)
            
        return api_success({"message": "Password updated successfully."})


class SessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # List active sessions
        sessions = Session.objects.filter(user=request.user, revoked=False, expires_at__gt=timezone.now())
        
        refresh_token = request.COOKIES.get('refresh_token')
        current_sess_id = None
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                current_sess_id = token.payload.get('session_id')
            except Exception:
                pass

        data = []
        for s in sessions:
            data.append({
                "id": str(s.id),
                "device_name": s.device.device_name,
                "platform": s.device.platform,
                "created_at": s.created_at,
                "last_activity": s.last_activity,
                "is_current": str(s.id) == current_sess_id
            })
            
        return api_success(data)


class SessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            sess = Session.objects.get(id=pk, user=request.user)
        except (Session.DoesNotExist, ValidationError):
            return api_error("SESSION_NOT_FOUND", "Session record not found.")
            
        sess.revoked = True
        sess.save()
        
        log_event(request.user, 'SESSION_REVOKED', request, {'session_id': str(sess.id)})
        return api_success({"message": "Session revoked successfully."})


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_credential = request.data.get('credential', '')
        if not token_credential:
            return api_error("VALIDATION_ERROR", "Google credential token is required.")
            
        try:
            # Backend-validation against Google APIs
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
            
            # Simple token decoding assertion verification
            id_info = id_token.verify_oauth2_token(
                token_credential,
                google_requests.Request(),
                client_id
            )
            
            email = id_info.get('email', '').strip().lower()
            name = id_info.get('name', '').strip()
            first_name = id_info.get('given_name', '').strip()
            last_name = id_info.get('family_name', '').strip()
            
            if not email:
                return api_error("INVALID_GOOGLE_TOKEN", "Google token contains no email.")
                
        except ValueError as e:
            return api_error("INVALID_GOOGLE_TOKEN", f"Google token validation failed: {str(e)}")
            
        with transaction.atomic():
            # Check or create account
            user = User.objects.filter(email=email).first()
            if not user:
                username = email.split('@')[0]
                if User.objects.filter(username=username).exists():
                    username = f"{username}_{secrets.token_hex(3)}"
                    
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=secrets.token_urlsafe(24),
                    first_name=first_name,
                    last_name=last_name,
                    role=User.VOTER,
                    account_status='ACTIVE',  # Pre-verified by Google
                    email_verified=True
                )
                # Save user profile
                profile = user.user_profile
                profile.full_name = name or username
                profile.save()
                
                log_event(user, 'ACCOUNT_CREATED', request, {'provider': 'GOOGLE'})
                
            # If account locked or suspended
            if user.account_status in ['SUSPENDED', 'LOCKED', 'DEACTIVATED']:
                return api_error("ACCOUNT_INACTIVE", "Your account is locked or inactive.")
                
            # Check-link Provider Audit
            log_event(user, 'GOOGLE_LOGIN', request)

            # Initiate OTP challenge for MFA enforcement
            otp_code = "".join(random.choices("0123456789", k=6))
            otp_code_hash = make_password(otp_code)
            
            otp_record = OTPVerification.objects.create(
                user=user,
                purpose='LOGIN',
                code_hash=otp_code_hash,
                expires_at=timezone.now() + timedelta(minutes=5)
            )
            
            # Send OTP via email
            try:
                EmailService.send_otp_email(user.email, otp_code)
            except Exception as e:
                print(f"[EMAIL ERROR] Failed to send OTP email: {e}", flush=True)
            
            if getattr(settings, 'DEMO_MODE', True):
                print(f"\n[DEMO GOOGLE LOGIN OTP] Verification code for '{user.username}': {otp_code}\n")
                
            log_event(user, 'OTP_SENT', request, {'challenge_id': str(otp_record.id)})
            
        return api_success({
            "status": "OTP_REQUIRED",
            "challenge_id": str(otp_record.id),
            "email": user.email
        })


class GoogleAccountLinkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Mocks Google Link status
        log_event(request.user, 'GOOGLE_ACCOUNT_LINKED', request)
        return api_success({"message": "Google account linked successfully."})

    def delete(self, request):
        # Mocks Google Unlink status
        # Safety: Do not unlink if Google is the only verification method
        if not request.user.has_usable_password():
            return api_error("UNLINK_DENIED", "You cannot unlink your Google account without setting a recovery password first.")
            
        log_event(request.user, 'GOOGLE_ACCOUNT_UNLINKED', request)
        return api_success({"message": "Google account unlinked successfully."})


class AIChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        if not message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        msg_lower = message.lower()
        
        if any(kw in msg_lower for kw in ['double vote', 'double-voting', 'twice', 'multiple votes', 'prevent', 'fraud', 'vote secrecy', 'anonymous', 'secure', 'security']):
            reply = (
                "🔒 **Double-Voting Prevention & Secrecy Architecture**:\n\n"
                "1. **Decoupled Tables**: When you submit a ballot, two distinct entries are written in an atomic database transaction. "
                "The `VoteReceipt` logs *that* you voted in a specific election (preventing you from voting again). "
                "The `Vote` table stores *who you voted for*, but it is completely disconnected from your identity (no user ID or citizen identifier is stored).\n"
                "2. **Cryptographic Receipt**: You receive a SHA-256 cryptographic receipt hash (e.g., `RECEIPT: H4X9...`). This allows you to verify that your ballot was entered in the audit ledger, but contains no details revealing *which* candidate you selected."
            )
        elif any(kw in msg_lower for kw in ['how to vote', 'steps to vote', 'voting terminal', 'process', 'guide']):
            reply = (
                "🗳️ **Step-by-Step Voting Guide**:\n\n"
                "1. **Register**: Go to the 'Register' page, fill in your details, and check your email to activate your account.\n"
                "2. **Login & OTP**: Log in with your email and password. Retrieve the 6-digit OTP from the backend server console and submit it.\n"
                "3. **Check Eligible Elections**: Access your Dashboard to see active elections you are registered for.\n"
                "4. **Cast Vote**: Click 'Enter Voting Hub', review candidates, and submit your encrypted ballot."
            )
        elif any(kw in msg_lower for kw in ['otp', 'verification code', 'verify code', 'cooldown', 'login code']):
            reply = (
                "🔑 **OTP Verification Details**:\n\n"
                "1. **Where is it?**: For this development/academic prototype, the OTP is printed directly in the **backend terminal/console logs** as: `[DEMO OTP] Verification code for 'voter1': 123456`.\n"
                "2. **Throttling/Cooldown**: You must wait 60 seconds between resending codes. You have a maximum of 3 entry attempts before you are forced to re-authenticate."
            )
        else:
            reply = (
                "👋 Hello! I am your DigiVoting AI Assistant.\n\n"
                "I can help you with:\n"
                "* **How to vote** on this platform.\n"
                "* Understanding **double-voting prevention** and cryptographic vote secrecy.\n"
                "* Finding your **OTP verification code** or fixing **webcam biometrics**.\n"
                "What can I help you with today?"
            )
            
        return Response({"reply": reply}, status=status.HTTP_200_OK)
