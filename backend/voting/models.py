import uuid
from django.db import models
from django.utils import timezone
from elections.models import Election, Candidate as ElectionCandidate, EligibleVoter
from locations.models import Constituency
from candidates.models import Candidate
from voters.models import VoterProfile

# =========================================================================
# LEGACY MODELS (Preserved for backward reference)
# =========================================================================

class VoteTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='vote_transactions')
    transaction_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transaction {self.transaction_hash[:10]}... for {self.election.title}"


class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='ballots')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='ballots')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='ballots')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Anonymous Ballot in {self.election.title} for candidate {self.candidate.name}"


class VoteReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='receipts')
    voter = models.ForeignKey(VoterProfile, on_delete=models.CASCADE, related_name='receipts')
    receipt_number = models.CharField(max_length=255, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('voter', 'election')

    def __str__(self):
        return f"Receipt {self.receipt_number[:8]} for voter in {self.election.title}"


# =========================================================================
# SECURE ENVELOPE-ENCRYPTED VOTING DATA MODELS
# =========================================================================

class ElectionEncryptionKey(models.Model):
    """
    Per-election symmetric key, generated at election creation, encrypted at rest
    using VOTING_MASTER_KEY. Only decrypted into memory during ballot encryption (voting)
    or tally decryption (results) — never persisted decrypted, never logged.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.OneToOneField(
        Election,
        on_delete=models.CASCADE,
        related_name='encryption_key'
    )
    encrypted_key = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"EncryptionKey for Election {self.election_id}"


class Ballot(models.Model):
    """
    Ballot:
    - id (UUID, random) — election (FK — this alone is fine, no voter link at all)
    - encrypted_choice (BinaryField)
    - submitted_at (DateTimeField, truncated to the minute — deliberate anonymity
      trade-off to prevent timestamp correlation side-channel attacks against voter lists)
    - CRITICAL: NO foreign key to User or EligibleVoter. Structurally absent, not just unused.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name='cast_ballots'
    )
    encrypted_choice = models.BinaryField()
    submitted_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        # Enforce deliberate anonymity trade-off: minute truncation
        if self.submitted_at:
            self.submitted_at = self.submitted_at.replace(second=0, microsecond=0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ballot {self.id} for Election {self.election_id}"


class BallotConfirmationToken(models.Model):
    """
    Short-lived (2 min) confirmation token issued after candidate selection.
    Must be redeemed in the same atomic transaction as the Ballot insertion.
    Single-use enforced via database row lock (select_for_update).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name='confirmation_tokens'
    )
    voter = models.ForeignKey(
        EligibleVoter,
        on_delete=models.CASCADE,
        related_name='confirmation_tokens'
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['election', 'voter']),
        ]

    def __str__(self):
        return f"ConfirmationToken for {self.voter.email} - used: {self.used}"


class VotingAuthorization(models.Model):
    """
    Module 2 & 3: Single-use, cryptographically verified authorization token
    issued only after all required identity challenges (OTP, Face verification)
    pass. Required to view ballot and cast vote.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name='voting_authorizations'
    )
    voter = models.ForeignKey(
        EligibleVoter,
        on_delete=models.CASCADE,
        related_name='voting_authorizations'
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed = models.BooleanField(default=False)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['election', 'voter']),
        ]

    def __str__(self):
        return f"VotingAuth for {self.voter.email} in {self.election.title} (consumed: {self.consumed})"


class ElectionResult(models.Model):
    """
    OneToOne with Election:
    - computed_at, total_ballots_cast
    - integrity_verified (BooleanField, default False — starts unverified, only flips
      True inside the successful branch of the tally integrity check; never default to True)
    - is_published (default False), published_at (nullable)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.OneToOneField(
        Election,
        on_delete=models.CASCADE,
        related_name='election_result'
    )
    computed_at = models.DateTimeField(auto_now=True)
    total_ballots_cast = models.PositiveIntegerField(default=0)
    integrity_verified = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Result for {self.election.title} (Verified: {self.integrity_verified}, Published: {self.is_published})"


class CandidateResult(models.Model):
    """
    Aggregated vote counts per candidate.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election_result = models.ForeignKey(
        ElectionResult,
        on_delete=models.CASCADE,
        related_name='candidate_results'
    )
    candidate = models.ForeignKey(
        ElectionCandidate,
        on_delete=models.CASCADE,
        related_name='candidate_results'
    )
    vote_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('election_result', 'candidate')
        ordering = ['-vote_count']

    def __str__(self):
        return f"{self.candidate.full_name}: {self.vote_count} votes"
