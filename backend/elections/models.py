import uuid
from django.conf import settings
from django.db import models

class Election(models.Model):
    ELECTION_TYPE_CHOICES = [
        ('general', 'General Election'),
        ('academic', 'Academic / Student Council'),
        ('club', 'Club / Society'),
        ('workplace', 'Workplace / Committee'),
        ('poll', 'Internal Poll'),
        ('organizational', 'Organizational'),
        ('referendum', 'Referendum'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('configured', 'Configured'),
        ('scheduled', 'Scheduled'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_elections'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    organization = models.CharField(max_length=255, blank=True, null=True)
    position_category = models.CharField(max_length=255, blank=True, null=True)
    election_type = models.CharField(max_length=30, choices=ELECTION_TYPE_CHOICES, default='general')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    is_locked = models.BooleanField(default=False)
    start_datetime = models.DateTimeField(null=True, blank=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    actual_start_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    stop_reason = models.TextField(null=True, blank=True)
    stopped_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stopped_elections'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_editable(self, field_group='core'):
        """
        Distinguishes allowed edit windows per field group:
        - 'core': title, description, election_type -> allowed ONLY in ['draft', 'configured'] and not is_locked
        - 'schedule': start_datetime, end_datetime -> allowed in ['draft', 'configured', 'scheduled'] and not is_locked
        - 'voters' / 'candidates' / 'verification' / 'rules': allowed ONLY in ['draft', 'configured'] and not is_locked
        Returns True if editable, False if locked.
        """
        if self.is_locked or self.status in ['active', 'paused', 'completed', 'cancelled']:
            return False
        if field_group == 'schedule':
            return self.status in ['draft', 'configured', 'scheduled']
        return self.status in ['draft', 'configured']

    def is_configuration_locked(self):
        """Returns True if voter rolls, candidates, verification config, or rules cannot be modified."""
        return not self.is_editable('voters')

    def is_rescheduling_allowed(self):
        """Returns True if start_datetime / end_datetime can still be adjusted."""
        return self.is_editable('schedule')

    @property
    def name(self):
        """Backward compatibility property for existing modules/foreign references."""
        return self.title

    @name.setter
    def name(self, value):
        self.title = value

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"


class ElectionPhase(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SCHEDULED', 'Scheduled'),
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='phases')
    name = models.CharField(max_length=100)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='DRAFT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} Phase for {self.election.name}"


class EligibleVoter(models.Model):
    """
    Module 9: Model representing a registered, eligible voter for a specific election.
    Supports pre-registering a voter by email before their User account exists.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Verification'),
        ('OTP_VERIFIED', 'OTP Verified'),
        ('FACE_VERIFIED', 'Face Verified'),
        ('VERIFIED', 'Fully Verified'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='eligible_voters')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eligible_elections'
    )
    email = models.EmailField(max_length=255)
    name = models.CharField(max_length=255, blank=True, null=True)
    student_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    mobile_number = models.CharField(max_length=30, blank=True, null=True)
    has_voted = models.BooleanField(default=False)
    verification_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    verified_at = models.DateTimeField(null=True, blank=True)
    voted_at = models.DateTimeField(null=True, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('election', 'email')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.email} in {self.election.title} (Voted: {self.has_voted}, Status: {self.verification_status})"


class Candidate(models.Model):
    """
    Module 9: Model representing a candidate running in a specific election.
    Supports photo uploads, customizable bio, and deterministic display order.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    full_name = models.CharField(max_length=255)
    party_or_affiliation = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(max_length=1000, blank=True, null=True)
    photo = models.ImageField(upload_to='candidates/%Y/%m/', blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    added_at = models.DateTimeField(auto_now_add=True)

    @property
    def manifesto(self):
        return self.bio

    @manifesto.setter
    def manifesto(self, value):
        self.bio = value

    class Meta:
        ordering = ['display_order', 'added_at']

    def __str__(self):
        party_str = f" ({self.party_or_affiliation})" if self.party_or_affiliation else ""
        return f"{self.full_name}{party_str} - {self.election.title}"


class ElectionVerificationConfig(models.Model):
    """
    Module 10: Model representing election-specific identity challenge rules.
    Controls whether voters must pass extra verification (Email OTP, Webcam, Biometrics)
    specifically for voting in this election, separate from baseline login authentication.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.OneToOneField(
        Election,
        on_delete=models.CASCADE,
        related_name='verification_config'
    )
    require_email_otp = models.BooleanField(default=True)
    require_webcam_verification = models.BooleanField(default=False)
    # Forward-looking configuration flag: Vote-time biometric matching infra belongs to a future module.
    require_biometric_verification = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Verification Config for {self.election.title}"


class ElectionRules(models.Model):
    """
    Module 10: Model representing election-level rules and visibility timing.
    Controls results reveal timing and voting behaviors.
    """
    RESULTS_VISIBILITY_CHOICES = [
        ('immediate', 'Immediate'),
        ('scheduled', 'Scheduled'),
        ('manual', 'Manual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.OneToOneField(
        Election,
        on_delete=models.CASCADE,
        related_name='rules'
    )
    results_visibility = models.CharField(
        max_length=20,
        choices=RESULTS_VISIBILITY_CHOICES,
        default='manual'
    )
    results_visible_at = models.DateTimeField(null=True, blank=True)
    # Config placeholder: Actual vote modification logic belongs to the Voting Module.
    allow_vote_change = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.results_visibility == 'scheduled':
            if not self.results_visible_at:
                raise ValidationError({"results_visible_at": "Results reveal time is required when results visibility is scheduled."})
            if self.election.end_datetime and self.results_visible_at <= self.election.end_datetime:
                raise ValidationError({"results_visible_at": "Results reveal time must be later than the election end time."})

    def __str__(self):
        return f"Rules for {self.election.title} (Visibility: {self.results_visibility})"


class ElectionAuditLog(models.Model):
    """
    Module 11: Comprehensive Audit Trail for an Election.
    Records every operational, configuration, and status transition event.
    """
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('voter_added', 'Voter Added'),
        ('voter_removed', 'Voter Removed'),
        ('candidate_added', 'Candidate Added'),
        ('candidate_updated', 'Candidate Updated'),
        ('candidate_removed', 'Candidate Removed'),
        ('verification_config_changed', 'Verification Config Changed'),
        ('rules_changed', 'Rules Changed'),
        ('status_changed', 'Status Changed'),
        ('started', 'Started'),
        ('paused', 'Paused'),
        ('resumed', 'Resumed'),
        ('stopped', 'Stopped'),
        ('completed', 'Completed'),
        ('auto_transitioned', 'Auto Transitioned'),
        ('tally_integrity_mismatch', 'Tally Integrity Mismatch'),
        ('results_published', 'Results Published'),
        ('results_unpublished', 'Results Unpublished'),
        ('verification_completed', 'Verification Completed'),
        ('vote_submitted', 'Vote Submitted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='election_audit_logs'
    )
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        actor_email = self.actor.email if self.actor else "System"
        return f"[{self.action}] on {self.election.title} by {actor_email} at {self.created_at}"


