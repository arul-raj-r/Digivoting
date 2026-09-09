from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from config.views import HealthCheckView, DatabaseHealthCheckView, SystemConfigView, ContactSubmissionView

api_v1_patterns = [
    # Health & System endpoints
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('health/database/', DatabaseHealthCheckView.as_view(), name='database_health_check'),
    path('system/config/', SystemConfigView.as_view(), name='v1_system_config'),
    path('contact/', ContactSubmissionView.as_view(), name='v1_contact_submission'),
    
    # Domain APIs
    path('auth/', include('accounts.urls')),
    path('auth/', include('authentication.urls')),
    path('voters/', include('voters.urls')),
    path('elections/', include('elections.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

from voting.verification_views import (
    VoterElectionsListView,
    VoterElectionEligibilityView,
    VoterElectionOTPView,
    VoterElectionFaceVerificationView,
    VoterVotingAuthorizationView,
)
from voting.views import (
    BallotEligibilityView,
    BallotConfirmView,
    BallotSubmitView,
    ElectionResultsView,
    ElectionResultsGenerateView,
    ElectionResultsPublishView,
    ElectionResultsUnpublishView,
    ElectionReportsParticipationView,
    ElectionReportsCandidatesView,
    ElectionReportsExportView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Direct System & Contact Endpoints
    path('api/system/config/', SystemConfigView.as_view(), name='system_config'),
    path('api/contact/', ContactSubmissionView.as_view(), name='contact_submission'),

    # Direct Auth Root for standard spec
    path('api/auth/', include('accounts.urls')),
    path('api/auth/', include('authentication.urls')),
    path('api/elections/', include('elections.urls')),

    # Direct Voter Portal REST APIs
    path('api/voter/elections/', VoterElectionsListView.as_view(), name='voter_elections_list'),
    path('api/voter/elections/<uuid:election_id>/eligibility/', VoterElectionEligibilityView.as_view(), name='voter_election_eligibility'),
    path('api/elections/<uuid:election_id>/eligibility/check/', VoterElectionEligibilityView.as_view(), name='election_eligibility_check'),
    path('api/voter/elections/<uuid:election_id>/otp/', VoterElectionOTPView.as_view(), name='voter_election_otp'),
    path('api/voter/elections/<uuid:election_id>/face-verification/', VoterElectionFaceVerificationView.as_view(), name='voter_election_face'),
    path('api/voter/elections/<uuid:election_id>/authorization/', VoterVotingAuthorizationView.as_view(), name='voter_election_auth'),

    # Direct Voting REST APIs
    path('api/voting/<uuid:election_id>/candidates/', BallotEligibilityView.as_view(), name='voting_candidates'),
    path('api/voting/<uuid:election_id>/confirm/', BallotConfirmView.as_view(), name='voting_confirm'),
    path('api/voting/<uuid:election_id>/submit/', BallotSubmitView.as_view(), name='voting_submit'),

    # Direct Results & Reports REST APIs
    path('api/results/<uuid:election_id>/', ElectionResultsView.as_view(), name='results_view'),
    path('api/results/<uuid:election_id>/generate/', ElectionResultsGenerateView.as_view(), name='results_generate'),
    path('api/results/<uuid:election_id>/publish/', ElectionResultsPublishView.as_view(), name='results_publish'),
    path('api/results/<uuid:election_id>/unpublish/', ElectionResultsUnpublishView.as_view(), name='results_unpublish'),
    path('api/reports/<uuid:election_id>/participation/', ElectionReportsParticipationView.as_view(), name='reports_participation'),
    path('api/reports/<uuid:election_id>/candidates/', ElectionReportsCandidatesView.as_view(), name='reports_candidates'),
    path('api/reports/<uuid:election_id>/export/', ElectionReportsExportView.as_view(), name='reports_export'),

    # API Version 1
    path('api/v1/', include((api_v1_patterns, 'v1'), namespace='v1')),
    
    # API Schema Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
