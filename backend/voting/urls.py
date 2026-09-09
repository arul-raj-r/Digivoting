from django.urls import path
from voting.views import (
    BallotEligibilityView,
    BallotConfirmView,
    BallotSubmitView,
    ElectionResultsPublishView,
    ElectionResultsUnpublishView,
    ElectionResultsGenerateView,
    ElectionResultsView,
    ElectionReportsParticipationView,
    ElectionReportsCandidatesView,
    ElectionReportsExportView,
)
from voting.verification_views import (
    VoterElectionEligibilityView,
    VoterElectionOTPView,
    VoterElectionFaceVerificationView,
    VoterVotingAuthorizationView,
)

urlpatterns = [
    # Voter Verification Flow endpoints
    path('verification/eligibility/', VoterElectionEligibilityView.as_view(), name='election_verification_eligibility'),
    path('verification/otp/', VoterElectionOTPView.as_view(), name='election_verification_otp'),
    path('verification/face/', VoterElectionFaceVerificationView.as_view(), name='election_verification_face'),
    path('verification/authorization/', VoterVotingAuthorizationView.as_view(), name='election_verification_authorization'),

    # Ballot endpoints (voter facing)
    path('ballot/', BallotEligibilityView.as_view(), name='ballot_eligibility'),
    path('ballot/confirm/', BallotConfirmView.as_view(), name='ballot_confirm'),
    path('ballot/submit/', BallotSubmitView.as_view(), name='ballot_submit'),

    # Results endpoints
    path('results/', ElectionResultsView.as_view(), name='election_results_view'),
    path('results/generate/', ElectionResultsGenerateView.as_view(), name='election_results_generate'),
    path('results/publish/', ElectionResultsPublishView.as_view(), name='election_results_publish'),
    path('results/unpublish/', ElectionResultsUnpublishView.as_view(), name='election_results_unpublish'),

    # Reports endpoints
    path('reports/participation/', ElectionReportsParticipationView.as_view(), name='election_reports_participation'),
    path('reports/candidates/', ElectionReportsCandidatesView.as_view(), name='election_reports_candidates'),
    path('reports/export/', ElectionReportsExportView.as_view(), name='election_reports_export'),
]
