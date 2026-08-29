import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ADMIN = 'ADMIN'
    VOTER = 'VOTER'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (VOTER, 'Voter'),
    ]
    STATUS_CHOICES = [
        ('PENDING_EMAIL_VERIFICATION', 'Pending Email Verification'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('LOCKED', 'Locked'),
        ('DEACTIVATED', 'Deactivated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=VOTER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    email_verified = models.BooleanField(default=False)
    mobile_verified = models.BooleanField(default=False)
    account_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING_EMAIL_VERIFICATION')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"


class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_profile')
    full_name = models.CharField(max_length=255, blank=True, null=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    profile_photo = models.TextField(blank=True, null=True)  # File path or base64 or URL
    preferred_language = models.CharField(max_length=10, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.email}"


class OTPVerification(models.Model):
    PURPOSE_CHOICES = [
        ('EMAIL_VERIFICATION', 'Email Verification'),
        ('LOGIN', 'Login'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('HIGH_RISK_AUTH', 'High Risk Auth'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_verifications')
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES)
    code_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.purpose} OTP for {self.user.email} - used: {self.used}"


class WebAuthnCredential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webauthn_credentials')
    credential_id = models.CharField(max_length=512, unique=True)
    public_key = models.TextField()  # Hex or Base64 formatted string
    sign_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"WebAuthn Credential for {self.user.email}"


class EmailVerificationToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    token_hash = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Email verification token for {self.user.email} - used: {self.used}"


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Password reset token for {self.user.email} - used: {self.used}"
