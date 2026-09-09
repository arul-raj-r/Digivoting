import uuid
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ADMIN = 'ADMIN'
    VOTER = 'VOTER'
    ELECTION_CREATOR = 'ELECTION_CREATOR'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (VOTER, 'Voter'),
        (ELECTION_CREATOR, 'Election Creator'),
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
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=VOTER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    email_verified = models.BooleanField(default=False)
    mobile_verified = models.BooleanField(default=False)
    account_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING_EMAIL_VERIFICATION')
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    failed_login_count = models.IntegerField(default=0)
    last_login_attempt = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)
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
        ('ELECTION_VERIFICATION', 'Election Verification'),
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


class LoginAttempt(models.Model):
    """
    Audit log model for all authentication login attempts.
    Never stores plaintext passwords or sensitive credentials.
    """
    METHOD_CHOICES = [
        ('password', 'Password'),
        ('google_oauth', 'Google OAuth'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts'
    )
    email_attempted = models.EmailField(max_length=255)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='password')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=False)
    mfa_completed = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['email_attempted', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
        ]

    def __str__(self):
        status_str = "SUCCESS" if self.success else f"FAILED ({self.failure_reason or 'Unknown'})"
        mfa_str = " [MFA Complete]" if self.mfa_completed else ""
        return f"Login attempt for {self.email_attempted} at {self.timestamp} - {status_str}{mfa_str}"


class OTPCode(models.Model):
    """
    Model for 6-digit Multi-Factor Authentication codes (Module 5).
    Stores only the SHA-256 hash of the code. Never stores plaintext.
    """
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code_hash = models.CharField(max_length=64)
    delivery_channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='email')
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"OTP for {self.user.email} (used={self.used}, attempts={self.attempt_count}/{self.max_attempts})"


class UserSession(models.Model):
    """
    Model for active citizen login sessions across devices (Module 6).
    Stores refresh_token_jti (JWT ID claim only), never raw tokens.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_token_jti = models.CharField(max_length=255, unique=True)
    device_label = models.CharField(max_length=255, default='Unknown Device')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_active_at']
        indexes = [
            models.Index(fields=['user', '-last_active_at']),
            models.Index(fields=['refresh_token_jti']),
        ]

    def __str__(self):
        status = "REVOKED" if self.revoked else "ACTIVE"
        return f"Session for {self.user.email} on {self.device_label} ({status})"


class SecurityEvent(models.Model):
    """
    Centralized Security & Audit Event Logging Model (Module 7).
    Records account lockouts, auto/manual unlocks, IP throttles, and suspicious pattern flags.
    """
    EVENT_CHOICES = [
        ('account_locked', 'Account Locked'),
        ('account_auto_unlocked', 'Account Auto Unlocked'),
        ('ip_throttled', 'IP Throttled'),
        ('suspicious_pattern', 'Suspicious Pattern'),
        ('manual_unlock', 'Manual Unlock'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auth_security_events'
    )
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "System/Anonymous"
        return f"[{self.event_type}] for {user_str} at {self.created_at}"



