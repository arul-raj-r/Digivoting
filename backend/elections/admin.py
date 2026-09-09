from django.contrib import admin
from .models import (
    Election,
    ElectionPhase,
    EligibleVoter,
    Candidate as ElectionCandidateModel,
    ElectionVerificationConfig,
    ElectionRules,
    ElectionAuditLog,
)

@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'organization', 'position_category', 'election_type', 'status', 'created_by', 'is_locked', 'created_at')
    list_filter = ('status', 'election_type', 'is_locked')
    search_fields = ('title', 'organization', 'position_category', 'description', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ElectionPhase)
class ElectionPhaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'election', 'status', 'start_datetime', 'end_datetime')
    list_filter = ('status', 'election')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(EligibleVoter)
class EligibleVoterAdmin(admin.ModelAdmin):
    list_display = ('email', 'name', 'student_id', 'mobile_number', 'election', 'has_voted', 'user', 'added_at')
    list_filter = ('has_voted', 'election')
    search_fields = ('email', 'name', 'student_id', 'mobile_number', 'election__title', 'user__email')
    readonly_fields = ('added_at',)


@admin.register(ElectionCandidateModel)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'election', 'party_or_affiliation', 'display_order', 'added_at')
    list_filter = ('election', 'party_or_affiliation')
    search_fields = ('full_name', 'party_or_affiliation', 'election__title')
    readonly_fields = ('added_at',)


@admin.register(ElectionVerificationConfig)
class ElectionVerificationConfigAdmin(admin.ModelAdmin):
    list_display = ('election', 'require_email_otp', 'require_webcam_verification', 'require_biometric_verification', 'updated_at')
    list_filter = ('require_email_otp', 'require_webcam_verification', 'require_biometric_verification')
    search_fields = ('election__title',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ElectionRules)
class ElectionRulesAdmin(admin.ModelAdmin):
    list_display = ('election', 'results_visibility', 'results_visible_at', 'allow_vote_change', 'updated_at')
    list_filter = ('results_visibility', 'allow_vote_change')
    search_fields = ('election__title',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ElectionAuditLog)
class ElectionAuditLogAdmin(admin.ModelAdmin):
    list_display = ('election', 'action', 'actor', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('election__title', 'actor__email', 'action')
    readonly_fields = ('election', 'action', 'actor', 'ip_address', 'details', 'created_at')



