from django.urls import path
from elections.views import (
    ElectionListCreateView,
    ElectionDetailView,
    VoterElectionsListView,
    CandidateListCreateView,
    CandidateDetailView,
    ApproveCandidateView,
    VoteCastView,
    ElectionResultsView,
    AdminSummaryView,
    ExportElectionResultsExcelView
)

urlpatterns = [
    path('', ElectionListCreateView.as_view(), name='election_list_create'),
    path('voter-overview/', VoterElectionsListView.as_view(), name='voter_elections_overview'),
    path('admin-summary/', AdminSummaryView.as_view(), name='admin_summary'),
    path('<uuid:pk>/', ElectionDetailView.as_view(), name='election_detail'),
    path('<uuid:pk>/results/', ElectionResultsView.as_view(), name='election_results'),
    path('<uuid:pk>/export/', ExportElectionResultsExcelView.as_view(), name='election_export'),
    path('candidates/', CandidateListCreateView.as_view(), name='candidate_list_create'),
    path('candidates/<uuid:pk>/', CandidateDetailView.as_view(), name='candidate_detail'),
    path('candidates/<uuid:pk>/approve/', ApproveCandidateView.as_view(), name='candidate_approve'),
    path('vote/', VoteCastView.as_view(), name='vote_cast'),
]
