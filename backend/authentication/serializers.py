from rest_framework import serializers
from authentication.models import User

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_voter = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name', 'phone_number', 'full_name', 'is_voter', 'is_admin')

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_is_voter(self, obj):
        return obj.role == User.VOTER

    def get_is_admin(self, obj):
        return obj.role == User.ADMIN

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class OTPVerifySerializer(serializers.Serializer):
    username = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)
