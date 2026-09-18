from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import AIAssistantFeedback, AIUnansweredQuestion, AIKnowledgeDocument


@admin.register(AIAssistantFeedback)
class AIAssistantFeedbackAdmin(admin.ModelAdmin):
    """
    Admin management for user feedback on AI responses.
    Includes answer quality metrics.
    """
    list_display = ('request_id', 'user_display', 'rating_badge', 'election', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('request_id', 'user__email', 'user__username')
    readonly_fields = ('request_id', 'user', 'rating', 'election', 'created_at')
    date_hierarchy = 'created_at'

    def user_display(self, obj):
        return obj.user.email if obj.user else "Anonymous"
    user_display.short_description = "User"

    def rating_badge(self, obj):
        if obj.rating == 'helpful':
            return format_html('<span style="color: #16a34a; font-weight: bold;">👍 Helpful</span>')
        return format_html('<span style="color: #dc2626; font-weight: bold;">👎 Not Helpful</span>')
    rating_badge.short_description = "Rating"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        # Calculate high-level quality metrics
        ratings = AIAssistantFeedback.objects.values('rating').annotate(total=Count('id'))
        metrics = {r['rating']: r['total'] for r in ratings}
        helpful_count = metrics.get('helpful', 0)
        not_helpful_count = metrics.get('not_helpful', 0)
        total_feedback = helpful_count + not_helpful_count
        ratio = round((helpful_count / total_feedback * 100), 1) if total_feedback > 0 else 0

        extra_context['quality_metrics'] = {
            'total_feedback': total_feedback,
            'helpful': helpful_count,
            'not_helpful': not_helpful_count,
            'satisfaction_rate': f"{ratio}%"
        }
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(AIUnansweredQuestion)
class AIUnansweredQuestionAdmin(admin.ModelAdmin):
    """
    Admin management for questions requiring knowledge expansion.
    """
    list_display = ('question_preview', 'reason', 'intent', 'status_badge', 'created_at')
    list_filter = ('status', 'reason', 'intent', 'created_at')
    search_fields = ('question', 'normalized_question', 'user__email')
    list_editable = ()
    readonly_fields = ('id', 'user', 'question', 'normalized_question', 'reason', 'intent', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    actions = ['mark_reviewing', 'mark_resolved', 'mark_ignored']

    def question_preview(self, obj):
        return obj.question[:80] + ("..." if len(obj.question) > 80 else "")
    question_preview.short_description = "Question"

    def status_badge(self, obj):
        colors = {
            'NEW': '#2563eb',
            'REVIEWING': '#d97706',
            'RESOLVED': '#16a34a',
            'IGNORED': '#64748b',
        }
        color = colors.get(obj.status, '#64748b')
        return format_html(f'<span style="color: {color}; font-weight: bold;">{obj.get_status_display()}</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Mark selected questions as REVIEWING")
    def mark_reviewing(self, request, queryset):
        queryset.update(status='REVIEWING')

    @admin.action(description="Mark selected questions as RESOLVED")
    def mark_resolved(self, request, queryset):
        queryset.update(status='RESOLVED')

    @admin.action(description="Mark selected questions as IGNORED")
    def mark_ignored(self, request, queryset):
        queryset.update(status='IGNORED')


@admin.register(AIKnowledgeDocument)
class AIKnowledgeDocumentAdmin(admin.ModelAdmin):
    """
    Admin management for official knowledge documents and versioning.
    """
    list_display = ('title', 'source_filename', 'version', 'status_badge', 'namespace', 'updated_at')
    list_filter = ('status', 'namespace')
    search_fields = ('title', 'source_filename', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    actions = ['make_active', 'make_archived']

    def status_badge(self, obj):
        colors = {
            'ACTIVE': '#16a34a',
            'INACTIVE': '#d97706',
            'ARCHIVED': '#64748b',
        }
        color = colors.get(obj.status, '#64748b')
        return format_html(f'<span style="color: {color}; font-weight: bold;">{obj.get_status_display()}</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Mark selected documents as ACTIVE")
    def make_active(self, request, queryset):
        from .services.knowledge_service import log_admin_action
        for doc in queryset:
            doc.status = 'ACTIVE'
            doc.save()
            log_admin_action(
                event_type="KNOWLEDGE_DOC_ACTIVATED",
                user=request.user,
                metadata={"document_id": str(doc.id), "title": doc.title, "version": doc.version}
            )

    @admin.action(description="Mark selected documents as ARCHIVED")
    def make_archived(self, request, queryset):
        from .services.knowledge_service import log_admin_action
        for doc in queryset:
            doc.status = 'ARCHIVED'
            doc.save()
            log_admin_action(
                event_type="KNOWLEDGE_DOC_ARCHIVED",
                user=request.user,
                metadata={"document_id": str(doc.id), "title": doc.title, "version": doc.version}
            )
