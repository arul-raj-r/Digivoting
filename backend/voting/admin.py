from django.contrib import admin
from .models import (
    VoteTransaction,
    Vote,
    VoteReceipt,
    ElectionEncryptionKey,
    Ballot,
    BallotConfirmationToken,
    VotingAuthorization,
    ElectionResult,
    CandidateResult
)

@admin.register(ElectionEncryptionKey)
class ElectionEncryptionKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'election', 'created_at')
    readonly_fields = ('encrypted_key', 'created_at')


@admin.register(Ballot)
class BallotAdmin(admin.ModelAdmin):
    list_display = ('id', 'election', 'submitted_at')
    list_filter = ('election',)
    readonly_fields = ('id', 'election', 'encrypted_choice', 'submitted_at')


@admin.register(BallotConfirmationToken)
class BallotConfirmationTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'election', 'voter', 'expires_at', 'used', 'created_at')
    list_filter = ('election', 'used')


@admin.register(VotingAuthorization)
class VotingAuthorizationAdmin(admin.ModelAdmin):
    list_display = ('id', 'election', 'voter', 'consumed', 'expires_at', 'consumed_at', 'created_at')
    list_filter = ('consumed', 'election')
    search_fields = ('voter__email', 'election__title')
    readonly_fields = ('created_at',)


@admin.register(ElectionResult)
class ElectionResultAdmin(admin.ModelAdmin):
    list_display = ('election', 'total_ballots_cast', 'integrity_verified', 'is_published', 'published_at', 'computed_at')
    list_filter = ('integrity_verified', 'is_published')


@admin.register(CandidateResult)
class CandidateResultAdmin(admin.ModelAdmin):
    list_display = ('election_result', 'candidate', 'vote_count')
    list_filter = ('election_result__election',)

