from django.urls import path
from authentication.views import (
    RegisterView,
    VerifyEmailView,
    ResendEmailVerificationView,
    LoginView,
    OTPVerifyView,
    OTPResendView,
    TokenRefreshCookieView,
    LogoutView,
    LogoutAllView,
    CurrentUserView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    SessionListView,
    SessionDetailView,
    GoogleLoginView,
    GoogleAccountLinkView,
    AIChatView
)

urlpatterns = [
    # Account Registration & Verification
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('resend-verification/', ResendEmailVerificationView.as_view(), name='auth_resend_verification'),
    
    # Credentials & OTP MFA
    path('login/', LoginView.as_view(), name='auth_login'),
    path('verify/', OTPVerifyView.as_view(), name='auth_verify'),  # Legacy compatibility
    path('verify-otp/', OTPVerifyView.as_view(), name='auth_verify_otp'),
    path('resend-otp/', OTPResendView.as_view(), name='auth_resend_otp'),
    
    # JWT Session Token Refresh
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='auth_token_refresh'),
    
    # Session Termination
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('logout-all/', LogoutAllView.as_view(), name='auth_logout_all'),
    
    # User Profile Info
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    
    # Password Management
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    
    # Device Sessions
    path('sessions/', SessionListView.as_view(), name='auth_sessions_list'),
    path('sessions/<uuid:pk>/', SessionDetailView.as_view(), name='auth_session_revoke'),
    
    # Google OAuth integration
    path('google/', GoogleLoginView.as_view(), name='auth_google_login'),
    path('google/link/', GoogleAccountLinkView.as_view(), name='auth_google_link'),
    
    # Support AI Chat
    path('ai-chat/', AIChatView.as_view(), name='auth_ai_chat'),
]
