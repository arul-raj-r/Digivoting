import random
import string
from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.generics import ListAPIView

from authentication.permissions import IsAdmin
from authentication.utils import log_event
from voters.models import Constituency, Voter, VoterIDCard
from voters.serializers import ConstituencySerializer, VoterProfileSerializer, VoterRegisterSerializer

def generate_card_number():
    while True:
        letters = ''.join(random.choices(string.ascii_uppercase, k=3))
        digits = ''.join(random.choices(string.digits, k=7))
        card_num = f"{letters}{digits}"
        if not VoterIDCard.objects.filter(card_number=card_num).exists():
            return card_num

class ConstituencyListView(ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Constituency.objects.all().order_by('name')
    serializer_class = ConstituencySerializer


class VoterRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VoterRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        voter = serializer.save()
        
        # Log registration event
        log_event(
            voter.user, 
            'VOTER_REGISTRATION', 
            request, 
            {
                'voter_id': str(voter.id),
                'constituency_name': voter.constituency.name
            }
        )
        
        return Response(
            VoterProfileSerializer(voter).data, 
            status=status.HTTP_201_CREATED
        )


class VoterListView(ListAPIView):
    permission_classes = [IsAdmin]
    queryset = Voter.objects.all().order_by('-created_at')
    serializer_class = VoterProfileSerializer


class PendingVotersView(ListAPIView):
    permission_classes = [IsAdmin]
    queryset = Voter.objects.filter(is_verified=False).order_by('-created_at')
    serializer_class = VoterProfileSerializer


class VerifyVoterView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            voter = Voter.objects.get(pk=pk)
        except Voter.DoesNotExist:
            return Response(
                {"error": "Voter profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        if voter.is_verified:
            return Response(
                {"message": "Voter is already verified."},
                status=status.HTTP_200_OK
            )
            
        with transaction.atomic():
            voter.is_verified = True
            voter.verification_date = timezone.now()
            voter.verified_by = request.user
            voter.save()
            
            # Auto-generate Voter ID Card
            card_number = generate_card_number()
            qr_code_data = f"{card_number}:{voter.id}"
            
            VoterIDCard.objects.get_or_create(
                voter=voter,
                defaults={
                    'card_number': card_number,
                    'full_name': f"{voter.user.first_name} {voter.user.last_name}".strip() or voter.user.username,
                    'date_of_birth': voter.date_of_birth,
                    'gender': voter.gender,
                    'constituency': voter.constituency,
                    'photo_url': voter.face_photo_url,
                    'qr_code_data': qr_code_data,
                    'status': 'ACTIVE'
                }
            )
            
            # Log verification event
            log_event(
                voter.user, 
                'VOTER_VERIFIED', 
                request, 
                {
                    'voter_id': str(voter.id),
                    'verified_by': request.user.username,
                    'card_number': card_number
                }
            )
            
        return Response(
            VoterProfileSerializer(voter).data,
            status=status.HTTP_200_OK
        )
