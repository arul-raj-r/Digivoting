from django.contrib import admin
from .models import VoterProfile

@admin.register(VoterProfile)
class VoterProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'voter_reference', 'verification_status', 'verification_method', 'verified_at')
    list_filter = ('verification_status', 'verification_method', 'constituency')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'voter_reference', 'user__email')
