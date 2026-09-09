from django.db import transaction
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from authentication.models import User
from authentication.serializers import UserSerializer
from locations.models import Constituency
from voters.models import VoterProfile

class ConstituencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Constituency
        fields = ('id', 'name', 'description')

class VoterProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)

    class Meta:
        model = VoterProfile
        fields = ('id', 'user', 'voter_reference', 'verification_status', 'verification_method', 'verified_at', 'constituency', 'constituency_name', 'face_photo_url', 'date_of_birth', 'gender')

class VoterRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        phone_number = validated_data.get('phone_number', '')

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
            # VoterProfile is auto-created or manually setup:
            VoterProfile.objects.get_or_create(user=user)
        return user
