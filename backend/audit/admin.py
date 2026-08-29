from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'user', 'severity', 'result', 'ip_address', 'created_at')
    list_filter = ('severity', 'result', 'created_at')
    search_fields = ('event_type', 'user__email', 'ip_address')
