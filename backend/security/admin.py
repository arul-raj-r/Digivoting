from django.contrib import admin
from .models import Device, Session, SecurityEvent

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('device_name', 'platform', 'user', 'last_seen', 'revoked')
    list_filter = ('platform', 'revoked')
    search_fields = ('device_name', 'user__email')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'device', 'created_at', 'expires_at', 'revoked')
    list_filter = ('revoked',)
    search_fields = ('user__email', 'device__device_name')


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'user', 'ip_address', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('user__email', 'ip_address')
