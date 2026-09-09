from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.generics import ListAPIView

from authentication.permissions import IsAdmin
from authentication.utils import log_event
from locations.models import Constituency
from voters.models import VoterProfile
from authentication.serializers import UserSerializer
from voters.serializers import ConstituencySerializer, VoterProfileSerializer, VoterRegisterSerializer

class ConstituencyListView(ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Constituency.objects.all().order_by('name')
    serializer_class = ConstituencySerializer


class VoterRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VoterRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log registration event
        log_event(
            user, 
            'USER_REGISTRATION', 
            request, 
            {
                'user_id': str(user.id)
            }
        )
        
        return Response(
            UserSerializer(user).data, 
            status=status.HTTP_201_CREATED
        )


class VoterListView(ListAPIView):
    permission_classes = [IsAdmin]
    queryset = VoterProfile.objects.all().order_by('-created_at')
    serializer_class = VoterProfileSerializer


class PendingVotersView(ListAPIView):
    permission_classes = [IsAdmin]
    queryset = VoterProfile.objects.filter(verification_status='PENDING').order_by('-created_at')
    serializer_class = VoterProfileSerializer


class VerifyVoterView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            voter = VoterProfile.objects.get(pk=pk)
        except VoterProfile.DoesNotExist:
            return Response(
                {"error": "Voter profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        if voter.verification_status == 'VERIFIED':
            return Response(
                {"message": "Voter is already verified."},
                status=status.HTTP_200_OK
            )
            
        with transaction.atomic():
            voter.verification_status = 'VERIFIED'
            voter.verified_at = timezone.now()
            voter.verified_by = request.user
            voter.verification_method = 'MANUAL'
            voter.save()
            
            # Log verification event
            log_event(
                voter.user, 
                'VOTER_VERIFIED', 
                request, 
                {
                    'voter_profile_id': str(voter.id),
                    'verified_by': request.user.email,
                }
            )
            
        return Response(
            VoterProfileSerializer(voter).data,
            status=status.HTTP_200_OK
        )
