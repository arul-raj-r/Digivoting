import uuid
from django.db import models
from django.conf import settings

class Device(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices')
    device_name = models.CharField(max_length=150)
    platform = models.CharField(max_length=50)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.device_name} ({self.platform}) for {self.user.email}"


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_sessions')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)

    def __str__(self):
        return f"Session {self.id} for {self.user.email} - active: {not self.revoked}"


class SecurityEvent(models.Model):
    EVENT_CHOICES = [
        ('FAILED_LOGIN', 'Failed Login Attempt'),
        ('RATE_LIMIT', 'Rate Limit Violation'),
        ('SUSPICIOUS_SESSION', 'Suspicious Session Detected'),
        ('LOCKOUT', 'Account Temporary Lockout'),
        ('VERIFICATION_FAILURE', 'Verification Step Failure'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_events')
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.event_type}] at {self.created_at}"
