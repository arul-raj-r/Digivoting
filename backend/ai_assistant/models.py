import uuid
from django.db import models
from django.conf import settings


class AIAssistantFeedback(models.Model):
    """
    Stores user feedback (Helpful / Not Helpful) on assistant responses.
    Linked to backend-generated safe request_id.
    """
    RATING_CHOICES = [
        ('helpful', 'Helpful'),
        ('not_helpful', 'Not Helpful'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_assistant_feedbacks'
    )
    request_id = models.UUIDField(db_index=True)
    rating = models.CharField(max_length=20, choices=RATING_CHOICES)
    election = models.ForeignKey(
        'elections.Election',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_assistant_feedbacks'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "AI Assistant Feedback"
        verbose_name_plural = "AI Assistant Feedbacks"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['rating', 'created_at']),
            models.Index(fields=['request_id']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Anonymous"
        return f"[{self.rating.upper()}] Request {self.request_id} by {user_str}"


class AIUnansweredQuestion(models.Model):
    """
    Tracks questions where the DigiVote Assistant had insufficient RAG context
    or low confidence, to assist administrators in improving knowledge coverage.
    """
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('REVIEWING', 'Reviewing'),
        ('RESOLVED', 'Resolved'),
        ('IGNORED', 'Ignored'),
    ]

    REASON_CHOICES = [
        ('NO_RAG_CONTEXT', 'No RAG Context'),
        ('LOW_RELEVANCE', 'Low Relevance'),
        ('UNSUPPORTED_REQUEST', 'Unsupported Request'),
        ('AI_ERROR', 'AI Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_unanswered_questions'
    )
    question = models.TextField(help_text="Redacted user question text.")
    normalized_question = models.TextField(db_index=True, help_text="Canonical normalized question text for aggregation.")
    reason = models.CharField(max_length=50, choices=REASON_CHOICES, default='NO_RAG_CONTEXT')
    intent = models.CharField(max_length=50, default='WEBSITE_HELP')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Unanswered Question"
        verbose_name_plural = "AI Unanswered Questions"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['reason']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.question[:60]}... ({self.reason})"


class AIKnowledgeDocument(models.Model):
    """
    Tracks metadata and versioning for official DigiVote knowledge documents
    ingested into the vector store.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    source_filename = models.CharField(max_length=255, unique=True, help_text="Matches vector source metadata")
    version = models.CharField(max_length=50, default='1.0')
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    namespace = models.CharField(max_length=100, default='digivote-docs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Knowledge Document"
        verbose_name_plural = "AI Knowledge Documents"
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} (v{self.version}) - {self.status}"
