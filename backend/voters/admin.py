from django.contrib import admin
from .models import VoterProfile, VoterIDCard

@admin.register(VoterProfile)
class VoterProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'voter_reference', 'verification_status', 'verification_method', 'verified_at')
    list_filter = ('verification_status', 'verification_method', 'constituency')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'voter_reference', 'user__email')


@admin.register(VoterIDCard)
class VoterIDCardAdmin(admin.ModelAdmin):
    list_display = ('card_number', 'voter', 'full_name', 'status', 'issued_date')
    list_filter = ('status', 'constituency')
    search_fields = ('card_number', 'full_name', 'voter__voter_reference')
