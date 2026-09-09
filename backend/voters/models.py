import uuid
from django.db import models
from django.conf import settings
from locations.models import Constituency

class VoterProfile(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('UNDER_REVIEW', 'Under Review'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
        ('SUSPENDED', 'Suspended'),
    ]
    METHOD_CHOICES = [
        ('MANUAL', 'Manual Admin Verification'),
        ('EMAIL_OTP', 'Email OTP Verification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='voter_profile')
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    voter_reference = models.CharField(max_length=50, unique=True, blank=True, null=True)
    verification_method = models.CharField(max_length=20, choices=METHOD_CHOICES, blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_voters'
    )
    constituency = models.ForeignKey(Constituency, on_delete=models.PROTECT, related_name='voters', blank=True, null=True)
    face_photo_url = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        full_name = f"{self.user.first_name} {self.user.last_name}".strip()
        return f"{full_name or self.user.username} ({self.voter_reference or 'Pending Reference'})"
