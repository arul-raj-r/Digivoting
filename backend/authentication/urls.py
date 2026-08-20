from django.urls import path
from authentication.views import LoginView, OTPVerifyView, CardVerifyView, CurrentUserView, AIChatView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('verify/', OTPVerifyView.as_view(), name='auth_verify'),
    path('verify-card/', CardVerifyView.as_view(), name='auth_verify_card'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    path('ai-chat/', AIChatView.as_view(), name='auth_ai_chat'),
]
