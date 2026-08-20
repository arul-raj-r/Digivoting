import uuid
from django.db import models
from django.conf import settings

class Constituency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Voter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='voter_profile')
    voter_id_number = models.CharField(max_length=50, unique=True)
    constituency = models.ForeignKey(Constituency, on_delete=models.PROTECT, related_name='voters')
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='verified_voters'
    )
    face_photo_url = models.TextField(blank=True, null=True)  # Stores raw photo URL for demo visual check
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.voter_id_number})"


class VoterIDCard(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voter = models.OneToOneField(Voter, on_delete=models.CASCADE, related_name='voter_id_card')
    card_number = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=50, blank=True, null=True)
    constituency = models.ForeignKey(Constituency, on_delete=models.PROTECT, related_name='voter_id_cards')
    photo_url = models.TextField(blank=True, null=True)  # Supabase Storage URL or base64 photo
    issued_date = models.DateTimeField(auto_now_add=True)
    qr_code_data = models.TextField(blank=True, null=True)  # Simple encoded string for demo
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    def __str__(self):
        return f"Card {self.card_number} for {self.full_name}"
