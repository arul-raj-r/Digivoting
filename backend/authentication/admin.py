from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserProfile, OTPVerification, WebAuthnCredential

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'account_status', 'email_verified', 'is_staff', 'is_superuser')
    list_filter = ('role', 'account_status', 'email_verified', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'email_verified', 'mobile_verified', 'account_status')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'email_verified', 'mobile_verified', 'account_status')}),
    )
    ordering = ('email',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'mobile_number', 'date_of_birth', 'preferred_language')
    search_fields = ('user__email', 'full_name', 'mobile_number')


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'purpose', 'attempt_count', 'max_attempts', 'used', 'expires_at', 'created_at')
    list_filter = ('purpose', 'used')
    search_fields = ('user__email', 'user__username')


@admin.register(WebAuthnCredential)
class WebAuthnCredentialAdmin(admin.ModelAdmin):
    list_display = ('user', 'credential_id', 'created_at')
    search_fields = ('user__email', 'credential_id')
