from django.contrib import admin
from .models import IdentityVerification

@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'verification_type', 'provider', 'status', 'verified_at')
    list_filter = ('status', 'verification_type', 'provider')
    search_fields = ('user__email', 'provider_reference')
    readonly_fields = ('created_at', 'updated_at')
