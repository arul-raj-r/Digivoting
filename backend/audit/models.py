import uuid
from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    SEVERITY_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical Threat'),
    ]
    RESULT_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    event_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=15, choices=SEVERITY_CHOICES, default='INFO')
    result = models.CharField(max_length=15, choices=RESULT_CHOICES, default='SUCCESS')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        username = self.user.email if self.user else "Anonymous"
        return f"[{self.event_type}] - {username} - {self.result} at {self.created_at}"
