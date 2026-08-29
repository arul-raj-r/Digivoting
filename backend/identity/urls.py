from django.urls import path
from .views import DigiLockerUrlView, DigiLockerCallbackView

urlpatterns = [
    path('digilocker/url/', DigiLockerUrlView.as_view(), name='digilocker_url'),
    path('digilocker/callback/', DigiLockerCallbackView.as_view(), name='digilocker_callback'),
]
