import uuid
from django.db import models
from voters.models import Constituency, Voter

class Election(models.Model):
    DRAFT = 'DRAFT'
    SCHEDULED = 'SCHEDULED'
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    
    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (SCHEDULED, 'Scheduled'),
        (ACTIVE, 'Active'),
        (COMPLETED, 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='candidates')
    name = models.CharField(max_length=150)
    party_name = models.CharField(max_length=150)
    party_logo_url = models.TextField(blank=True, null=True)
    photo_url = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.party_name} (Approved: {self.is_approved})"

class VoteReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='vote_receipts')
    voter = models.ForeignKey(Voter, on_delete=models.CASCADE, related_name='vote_receipts')
    receipt_number = models.CharField(max_length=255, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('voter', 'election')

    def __str__(self):
        return f"Receipt {self.receipt_number[:8]} for voter in {self.election.title}"

class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='votes')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='votes')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='votes')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ballot for {self.candidate.name} in {self.election.title}"
