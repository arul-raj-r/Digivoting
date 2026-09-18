from django.urls import path
from .views import AIHealthCheckView, AIChatView, AIFeedbackView

app_name = 'ai_assistant'

urlpatterns = [
    path('health/', AIHealthCheckView.as_view(), name='ai_health_check'),
    path('chat/', AIChatView.as_view(), name='ai_chat'),
    path('feedback/', AIFeedbackView.as_view(), name='ai_feedback'),
]

