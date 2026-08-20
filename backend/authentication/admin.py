from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, OTPVerification, WebAuthnCredential, AuditLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number')}),
    )

@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'attempts', 'is_verified', 'created_at', 'expires_at')
    list_filter = ('is_verified',)
    search_fields = ('user__username', 'user__email')

@admin.register(WebAuthnCredential)
class WebAuthnCredentialAdmin(admin.ModelAdmin):
    list_display = ('user', 'credential_id', 'created_at')
    search_fields = ('user__username', 'credential_id')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'ip_address', 'created_at')
    list_filter = ('action',)
    search_fields = ('user__username', 'action')
