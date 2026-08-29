import uuid
from django.db import models
from elections.models import Election
from locations.models import Constituency
from candidates.models import Candidate
from voters.models import VoterProfile

class VoteTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='vote_transactions')
    transaction_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transaction {self.transaction_hash[:10]}... for {self.election.name}"


class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='ballots')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='ballots')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='ballots')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Anonymous Ballot in {self.election.name} for candidate {self.candidate.name}"


class VoteReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='receipts')
    voter = models.ForeignKey(VoterProfile, on_delete=models.CASCADE, related_name='receipts')
    receipt_number = models.CharField(max_length=255, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('voter', 'election')

    def __str__(self):
        return f"Receipt {self.receipt_number[:8]} for voter in {self.election.name}"
