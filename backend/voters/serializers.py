from django.db import transaction
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from authentication.models import User
from authentication.serializers import UserSerializer
from voters.models import Constituency, Voter, VoterIDCard

class ConstituencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Constituency
        fields = ('id', 'name', 'description')

class VoterIDCardSerializer(serializers.ModelSerializer):
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)

    class Meta:
        model = VoterIDCard
        fields = ('id', 'card_number', 'full_name', 'date_of_birth', 'gender', 'constituency_name', 'photo_url', 'issued_date', 'qr_code_data', 'status')

class VoterProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    voter_id_card = VoterIDCardSerializer(read_only=True, required=False, allow_null=True)

    class Meta:
        model = Voter
        fields = ('id', 'user', 'voter_id_number', 'constituency', 'constituency_name', 'is_verified', 'verification_date', 'face_photo_url', 'date_of_birth', 'gender', 'voter_id_card')

class VoterRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    voter_id_number = serializers.CharField(max_length=50)
    constituency_id = serializers.PrimaryKeyRelatedField(
        queryset=Constituency.objects.all(), source='constituency'
    )
    face_photo_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=True)
    gender = serializers.CharField(max_length=20, required=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_voter_id_number(self, value):
        if Voter.objects.filter(voter_id_number=value).exists():
            raise serializers.ValidationError("Voter ID number is already registered.")
        return value

    def create(self, validated_data):
        constituency = validated_data.pop('constituency')
        voter_id_number = validated_data.pop('voter_id_number')
        face_photo_url = validated_data.get('face_photo_url', '')
        password = validated_data.pop('password')
        phone_number = validated_data.get('phone_number', '')
        date_of_birth = validated_data.pop('date_of_birth')
        gender = validated_data.pop('gender')

        from django.utils import timezone
        from voters.views import generate_card_number

        with transaction.atomic():
            user = User.objects.create(
                username=validated_data['username'],
                email=validated_data['email'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                phone_number=phone_number,
                password=make_password(password),
                role=User.VOTER
            )
            voter = Voter.objects.create(
                user=user,
                voter_id_number=voter_id_number,
                constituency=constituency,
                face_photo_url=face_photo_url,
                date_of_birth=date_of_birth,
                gender=gender,
                is_verified=True,
                verification_date=timezone.now()
            )
            
            # Auto-generate Voter ID Card
            card_number = generate_card_number()
            qr_code_data = f"{card_number}:{voter.id}"
            
            VoterIDCard.objects.create(
                voter=voter,
                card_number=card_number,
                full_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                date_of_birth=voter.date_of_birth,
                gender=voter.gender,
                constituency=voter.constituency,
                photo_url=voter.face_photo_url,
                qr_code_data=qr_code_data,
                status='ACTIVE'
            )
        return voter
