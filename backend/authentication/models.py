from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    ADMIN = 'ADMIN'
    VOTER = 'VOTER'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (VOTER, 'Voter'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=VOTER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class OTPVerification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_verifications')
    otp_code_hash = models.CharField(max_length=255)
    attempts = models.IntegerField(default=0)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"OTP for {self.user.username} - verified: {self.is_verified}"


class WebAuthnCredential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webauthn_credentials')
    credential_id = models.CharField(max_length=512, unique=True)
    public_key = models.TextField()  # Hex or Base64 formatted string
    sign_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"WebAuthn Credential for {self.user.username}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"[{self.action}] by {username} at {self.created_at}"
