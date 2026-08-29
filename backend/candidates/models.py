import uuid
from django.db import models
from elections.models import Election
from locations.models import Constituency

class PoliticalParty(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    symbol_tag = models.CharField(max_length=50, unique=True)  # e.g., CAP, FRC, SPF
    symbol_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Political Parties'

    def __str__(self):
        return f"{self.name} ({self.symbol_tag})"


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    party = models.ForeignKey(PoliticalParty, on_delete=models.CASCADE, related_name='candidates')
    bio = models.TextField(blank=True, null=True)
    photo_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.party.symbol_tag})"


class ElectionCandidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='election_candidates')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='election_candidates')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='election_candidates')
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('election', 'constituency', 'candidate')

    def __str__(self):
        return f"{self.candidate.name} in {self.election.name} ({self.constituency.name})"
