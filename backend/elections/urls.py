from django.urls import path, include
from elections.views import (
    ElectionListCreateView,
    ElectionDetailView,
    EligibleVoterListCreateView,
    EligibleVoterBulkUploadView,
    EligibleVoterDetailView,
    CandidateListCreateView,
    CandidateDetailView,
    CandidateReorderView,
    ElectionVerificationConfigView,
    ElectionRulesView,
    LegacyCandidateListView,
    LegacyCandidateDetailView,
    VoterElectionsListView,
    ApproveCandidateView,
    VoteCastView,
    ElectionResultsView,
    AdminSummaryView,
    ExportElectionResultsExcelView,
    ElectionStartView,
    ElectionPauseView,
    ElectionResumeView,
    ElectionCompleteView,
    ElectionStopView,
    ElectionAuditLogListView,
    ElectionMonitoringView
)

from voting.views import (
    ElectionReportsParticipationView,
    ElectionReportsCandidatesView,
    ElectionReportsExportView,
)

urlpatterns = [
    path('', ElectionListCreateView.as_view(), name='election_list_create'),
    path('voter-overview/', VoterElectionsListView.as_view(), name='voter_elections_overview'),
    path('admin-summary/', AdminSummaryView.as_view(), name='admin_summary'),
    path('<uuid:pk>/', ElectionDetailView.as_view(), name='election_detail'),

    # Reports direct routes (for frontend API compatibility)
    path('<uuid:election_id>/reports/export/', ElectionReportsExportView.as_view(), name='election_reports_export_direct'),
    path('<uuid:election_id>/reports/participation/', ElectionReportsParticipationView.as_view(), name='election_reports_participation_direct'),
    path('<uuid:election_id>/reports/candidates/', ElectionReportsCandidatesView.as_view(), name='election_reports_candidates_direct'),

    # Voting, Results & Reports Routes (voting app)
    path('<uuid:election_id>/', include('voting.urls')),

    # Module 11: Election Lifecycle, Audit & Monitoring Routes
    path('<uuid:election_id>/start/', ElectionStartView.as_view(), name='election_start'),
    path('<uuid:election_id>/pause/', ElectionPauseView.as_view(), name='election_pause'),
    path('<uuid:election_id>/resume/', ElectionResumeView.as_view(), name='election_resume'),
    path('<uuid:election_id>/complete/', ElectionCompleteView.as_view(), name='election_complete'),
    path('<uuid:election_id>/stop/', ElectionStopView.as_view(), name='election_stop'),
    path('<uuid:election_id>/audit-logs/', ElectionAuditLogListView.as_view(), name='election_audit_logs'),
    path('<uuid:election_id>/monitoring/', ElectionMonitoringView.as_view(), name='election_monitoring'),
    path('<uuid:election_id>/monitor/', ElectionMonitoringView.as_view(), name='election_monitoring_alias'),

    # Module 9: Nested Voter Configuration Routes
    path('<uuid:election_id>/voters/', EligibleVoterListCreateView.as_view(), name='election_voter_list_create'),
    path('<uuid:election_id>/voters/bulk-upload/', EligibleVoterBulkUploadView.as_view(), name='election_voter_bulk_upload'),
    path('<uuid:election_id>/voters/<uuid:pk>/', EligibleVoterDetailView.as_view(), name='election_voter_detail'),

    # Module 9: Nested Candidate Configuration Routes
    path('<uuid:election_id>/candidates/', CandidateListCreateView.as_view(), name='election_candidate_list_create'),
    path('<uuid:election_id>/candidates/reorder/', CandidateReorderView.as_view(), name='election_candidate_reorder'),
    path('<uuid:election_id>/candidates/<uuid:pk>/', CandidateDetailView.as_view(), name='election_candidate_detail'),

    # Module 10: Nested Verification Setup & Rules Configuration Routes
    path('<uuid:election_id>/verification-config/', ElectionVerificationConfigView.as_view(), name='election_verification_config'),
    path('<uuid:election_id>/rules/', ElectionRulesView.as_view(), name='election_rules'),

    # Legacy candidates routes
    path('candidates/', LegacyCandidateListView.as_view(), name='legacy_candidate_list_create'),
    path('candidates/<uuid:pk>/', LegacyCandidateDetailView.as_view(), name='legacy_candidate_detail'),
    path('candidates/<uuid:pk>/approve/', ApproveCandidateView.as_view(), name='candidate_approve'),
    path('vote/', VoteCastView.as_view(), name='vote_cast'),
]
