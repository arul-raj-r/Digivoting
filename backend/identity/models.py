import uuid
from django.db import models
from django.conf import settings

class IdentityVerification(models.Model):
    TYPE_CHOICES = [
        ('VOTER_ID', 'Voter ID'),
        ('AADHAAR', 'Aadhaar'),
        ('DIGILOCKER', 'DigiLocker'),
        ('MANUAL', 'Manual'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('VERIFIED', 'Verified'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
        ('REVOKED', 'Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='identity_verifications')
    verification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    provider = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    provider_reference = models.CharField(max_length=150, blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    failure_reason = models.CharField(max_length=255, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.verification_type} check for {self.user.email} - {self.status}"
