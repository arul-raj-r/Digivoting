from django.contrib import admin
from .models import PoliticalParty, Candidate, ElectionCandidate

@admin.register(PoliticalParty)
class PoliticalPartyAdmin(admin.ModelAdmin):
    list_display = ('name', 'symbol_tag', 'created_at')
    search_fields = ('name', 'symbol_tag')


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'party', 'created_at')
    list_filter = ('party',)
    search_fields = ('name', 'bio')


@admin.register(ElectionCandidate)
class ElectionCandidateAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'election', 'constituency', 'is_approved')
    list_filter = ('is_approved', 'election', 'constituency')
    search_fields = ('candidate__name', 'constituency__name')
