from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, 
    UserProfile, 
    OTPVerification, 
    WebAuthnCredential,
    LoginAttempt,
    OTPCode,
    UserSession,
    SecurityEvent,
    EmailVerificationToken,
    PasswordResetToken
)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'account_status', 'email_verified', 'is_staff', 'is_superuser')
    list_filter = ('role', 'account_status', 'email_verified', 'is_staff', 'is_superuser')
    search_fields = ('email', 'username', 'phone_number')
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
    list_filter = ('purpose', 'used', 'created_at')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('created_at',)


@admin.register(WebAuthnCredential)
class WebAuthnCredentialAdmin(admin.ModelAdmin):
    list_display = ('user', 'credential_id', 'sign_count', 'created_at')
    search_fields = ('user__email', 'credential_id')
    readonly_fields = ('created_at',)


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('email_attempted', 'method', 'ip_address', 'success', 'mfa_completed', 'failure_reason', 'timestamp')
    list_filter = ('success', 'mfa_completed', 'method', 'timestamp')
    search_fields = ('email_attempted', 'ip_address', 'failure_reason')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'delivery_channel', 'attempt_count', 'max_attempts', 'used', 'expires_at', 'created_at')
    list_filter = ('used', 'delivery_channel', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_label', 'ip_address', 'revoked', 'last_active_at', 'expires_at')
    list_filter = ('revoked', 'last_active_at')
    search_fields = ('user__email', 'device_label', 'ip_address')
    readonly_fields = ('created_at', 'last_active_at')
    ordering = ('-last_active_at',)


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'user', 'ip_address', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('user__email', 'ip_address', 'event_type')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'used', 'expires_at', 'created_at')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'used', 'expires_at', 'created_at')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)

