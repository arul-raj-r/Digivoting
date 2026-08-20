from django.urls import path
from voters.views import (
    ConstituencyListView,
    VoterRegisterView,
    VoterListView,
    PendingVotersView,
    VerifyVoterView
)

urlpatterns = [
    path('constituencies/', ConstituencyListView.as_view(), name='constituency_list'),
    path('register/', VoterRegisterView.as_view(), name='voter_register'),
    path('all/', VoterListView.as_view(), name='voter_list'),
    path('pending/', PendingVotersView.as_view(), name='voter_pending'),
    path('<uuid:pk>/verify/', VerifyVoterView.as_view(), name='voter_verify'),
]
