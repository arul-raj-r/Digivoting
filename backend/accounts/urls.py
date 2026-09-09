from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import (
    RegisterView,
    LoginView,
    GoogleAuthView,
    VerifyEmailView,
    ResendVerificationView,
    SendOTPView,
    VerifyOTPView,
    ResendOTPView,
    SessionListView,
    SessionRevokeView,
    RevokeAllSessionsView,
    LogoutView,
    SecurityEventListView,
    AdminUnlockUserView,
    UserSecurityActivityView,
    ForgotPasswordView,
    ResetPasswordView,
    CurrentUserView
)

app_name = 'accounts'

urlpatterns = [
    # Module 1: Registration
    path('register/', RegisterView.as_view(), name='register'),

    # Module 2: Login
    path('login/', LoginView.as_view(), name='login'),

    # Module 3: Google OAuth
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('google/callback/', GoogleAuthView.as_view(), name='google_callback'),

    # Module 4: Email Verification
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),

    # Module 5: OTP MFA & Aliases
    path('otp/send/', SendOTPView.as_view(), name='otp_send'),
    path('otp/verify/', VerifyOTPView.as_view(), name='otp_verify'),
    path('otp/resend/', ResendOTPView.as_view(), name='otp_resend'),
    path('request-otp/', SendOTPView.as_view(), name='request_otp_alias'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp_alias'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend_otp_alias'),

    # Module 6: Session Management & JWT Refresh
    path('sessions/', SessionListView.as_view(), name='session_list'),
    path('sessions/revoke-all/', RevokeAllSessionsView.as_view(), name='session_revoke_all'),
    path('sessions/<uuid:session_id>/', SessionRevokeView.as_view(), name='session_revoke'),
    path('sessions/<uuid:session_id>/revoke/', SessionRevokeView.as_view(), name='session_revoke_explicit'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Identity / User Me
    path('me/', CurrentUserView.as_view(), name='auth_me'),

    # Password Reset & Recovery
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('password-reset/request/', ForgotPasswordView.as_view(), name='password_reset_request'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('password-reset/confirm/', ResetPasswordView.as_view(), name='password_reset_confirm'),

    # Module 7: Security Audit Logs & Governance
    path('security-activity/', UserSecurityActivityView.as_view(), name='user_security_activity'),
    path('security/logs/', UserSecurityActivityView.as_view(), name='user_security_logs_alias'),
    path('admin/security-events/', SecurityEventListView.as_view(), name='admin_security_events'),
    path('admin/users/<uuid:user_id>/unlock/', AdminUnlockUserView.as_view(), name='admin_user_unlock'),
]





