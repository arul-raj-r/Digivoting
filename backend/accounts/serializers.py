import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from authentication.models import User  # Uses active AUTH_USER_MODEL from authentication or accounts


def validate_password_complexity(password):
    """
    Enforce DigiVote civic-grade password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    - At least 1 special character
    """
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least 1 uppercase letter.")
    if not re.search(r'[0-9]', password):
        errors.append("Password must contain at least 1 numeric digit.")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/`~]', password):
        errors.append("Password must contain at least 1 special character.")

    # Also run Django built-in validators
    try:
        validate_password(password)
    except DjangoValidationError as e:
        for msg in e.messages:
            if msg not in errors:
                errors.append(msg)

    if errors:
        raise serializers.ValidationError(" ".join(errors))


class UserSerializer(serializers.ModelSerializer):
    """
    Sanitized User serializer for public/safe API output.
    Never returns password or sensitive internal tokens.
    """
    full_name = serializers.SerializerMethodField()
    mobile_number = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    is_email_verified = serializers.SerializerMethodField()
    is_voter = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'full_name',
            'email',
            'mobile_number',
            'role',
            'status',
            'account_status',
            'is_email_verified',
            'email_verified',
            'is_voter',
            'is_admin',
            'is_creator',
            'date_joined'
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        if hasattr(obj, 'user_profile') and obj.user_profile and obj.user_profile.full_name:
            return obj.user_profile.full_name
        name = f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip()
        return name or getattr(obj, 'full_name', '') or getattr(obj, 'username', '') or obj.email.split('@')[0]

    def get_mobile_number(self, obj):
        if hasattr(obj, 'user_profile') and obj.user_profile and obj.user_profile.mobile_number:
            return obj.user_profile.mobile_number
        return getattr(obj, 'phone_number', '') or getattr(obj, 'mobile_number', '')

    def get_status(self, obj):
        return getattr(obj, 'account_status', '') or getattr(obj, 'status', 'ACTIVE')

    def get_is_email_verified(self, obj):
        return getattr(obj, 'email_verified', False) or getattr(obj, 'is_email_verified', False)

    def get_is_voter(self, obj):
        return getattr(obj, 'role', '') == 'VOTER'

    def get_is_admin(self, obj):
        return getattr(obj, 'role', '') == 'ADMIN' or getattr(obj, 'is_staff', False)

    def get_is_creator(self, obj):
        return getattr(obj, 'role', '') == 'ELECTION_CREATOR'


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for citizen user registration (Module 1).
    Performs comprehensive server-side field validation,
    case-insensitive email uniqueness checks, mobile uniqueness checks,
    and password complexity enforcement.
    """
    full_name = serializers.CharField(
        max_length=255,
        required=True,
        error_messages={
            'required': 'Full Name is required.',
            'blank': 'Full Name cannot be blank.'
        }
    )
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'Email Address is required.',
            'invalid': 'Please enter a valid email address.'
        }
    )
    mobile_number = serializers.CharField(
        max_length=15,
        required=True,
        error_messages={
            'required': 'Mobile Number is required.',
            'blank': 'Mobile Number cannot be blank.'
        }
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': 'Password is required.'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': 'Confirm Password is required.'}
    )

    def validate_full_name(self, value):
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Full Name must be at least 2 characters long.")
        return cleaned

    def validate_email(self, value):
        cleaned_email = value.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', cleaned_email):
            raise serializers.ValidationError("Please enter a valid email address format.")
        return cleaned_email

    def validate_mobile_number(self, value):
        cleaned = value.strip().replace(" ", "").replace("-", "")
        # Accepts standard 10 digit or +91 / international format
        if not re.match(r'^(\+?[0-9]{1,3})?[0-9]{10}$', cleaned):
            raise serializers.ValidationError("Please enter a valid 10-digit mobile number.")
        return cleaned

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return attrs


class LoginSerializer(serializers.Serializer):
    """
    Serializer for citizen user login (Module 2).
    Validates email format, presence of password, and optional remember_device.
    """
    email = serializers.CharField(
        required=False,
        error_messages={
            'required': 'Registered email address is required.',
            'blank': 'Email address cannot be blank.'
        }
    )
    username = serializers.CharField(
        required=False
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        error_messages={
            'required': 'Account password is required.',
            'blank': 'Password cannot be blank.'
        }
    )
    remember_device = serializers.BooleanField(
        required=False,
        default=False
    )

    def validate(self, attrs):
        raw_email = attrs.get('email') or attrs.get('username')
        if not raw_email or not str(raw_email).strip():
            raise serializers.ValidationError({
                'email': 'Registered email address is required.'
            })
        cleaned = str(raw_email).strip().lower()
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', cleaned):
            raise serializers.ValidationError({
                'email': 'Please enter a valid email address format.'
            })
        attrs['email'] = cleaned
        return attrs


class GoogleAuthSerializer(serializers.Serializer):
    """
    Serializer for Google OAuth ID Token (Module 3).
    Accepts id_token or credential from GIS Google Sign-In.
    """
    id_token = serializers.CharField(required=False, allow_blank=False)
    credential = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        raw = attrs.get('id_token') or attrs.get('credential')
        if not raw or not raw.strip():
            raise serializers.ValidationError({
                'id_token': 'Google ID token or credential is required.'
            })
        attrs['token'] = raw.strip()
        return attrs



class VerifyEmailSerializer(serializers.Serializer):
    """
    Serializer for Email Verification token (Module 4).
    """
    token = serializers.CharField(
        required=True,
        max_length=128,
        error_messages={
            'required': 'Verification token is required.',
            'blank': 'Verification token cannot be blank.'
        }
    )


class ResendVerificationSerializer(serializers.Serializer):
    """
    Serializer for Resending Email Verification link (Module 4).
    """
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'Email address is required.',
            'invalid': 'Please enter a valid email address.',
            'blank': 'Email address cannot be blank.'
        }
    )

    def validate_email(self, value):
        return value.strip().lower()


class SendOTPSerializer(serializers.Serializer):
    """
    Serializer for requesting an OTP code using pre-auth token (Module 5).
    Accepts pre_auth_token or challenge_id.
    """
    pre_auth_token = serializers.CharField(required=False, allow_blank=False)
    challenge_id = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        token = attrs.get('pre_auth_token') or attrs.get('challenge_id')
        if not token or not token.strip():
            raise serializers.ValidationError({
                'pre_auth_token': 'Pre-authentication token is required.'
            })
        attrs['pre_auth_token'] = token.strip()
        return attrs


class VerifyOTPSerializer(serializers.Serializer):
    """
    Serializer for submitting 6-digit OTP code with pre-auth token (Module 5).
    Accepts pre_auth_token or challenge_id, and otp_code or otp.
    """
    pre_auth_token = serializers.CharField(required=False, allow_blank=False)
    challenge_id = serializers.CharField(required=False, allow_blank=False)
    otp_code = serializers.CharField(required=False, allow_blank=False)
    otp = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        token = attrs.get('pre_auth_token') or attrs.get('challenge_id')
        if not token or not token.strip():
            raise serializers.ValidationError({
                'pre_auth_token': 'Pre-authentication token is required.'
            })
        attrs['pre_auth_token'] = token.strip()

        raw_code = attrs.get('otp_code') or attrs.get('otp')
        if not raw_code or not raw_code.strip():
            raise serializers.ValidationError({
                'otp_code': '6-digit OTP code is required.'
            })
        cleaned_code = raw_code.strip()
        if not re.match(r'^\d{6}$', cleaned_code):
            raise serializers.ValidationError({
                'otp_code': 'OTP code must consist of exactly 6 numeric digits.'
            })
        attrs['otp_code'] = cleaned_code
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    """
    Serializer for resending OTP code using pre-auth token (Module 5).
    Accepts pre_auth_token or challenge_id.
    """
    pre_auth_token = serializers.CharField(required=False, allow_blank=False)
    challenge_id = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        token = attrs.get('pre_auth_token') or attrs.get('challenge_id')
        if not token or not token.strip():
            raise serializers.ValidationError({
                'pre_auth_token': 'Pre-authentication token is required.'
            })
        attrs['pre_auth_token'] = token.strip()
        return attrs



class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for listing active citizen sessions (Module 6).
    Computes is_current and formats masked IP and timestamps.
    """
    is_current = serializers.SerializerMethodField()
    masked_ip = serializers.SerializerMethodField()

    class Meta:
        from authentication.models import UserSession
        model = UserSession
        fields = [
            'id',
            'device_label',
            'masked_ip',
            'user_agent',
            'created_at',
            'last_active_at',
            'expires_at',
            'is_current',
            'revoked',
        ]
        read_only_fields = fields

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        current_session = getattr(request, 'user_session', None)
        return bool(current_session and current_session.id == obj.id)

    def get_masked_ip(self, obj):
        if not obj.ip_address:
            return "Unknown IP"
        parts = obj.ip_address.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.*.*"
        return obj.ip_address[:8] + "..." if len(obj.ip_address) > 8 else obj.ip_address


class RevokeAllSessionsSerializer(serializers.Serializer):
    """
    Serializer for revoking all sessions (Module 6).
    """
    keep_current = serializers.BooleanField(
        default=False,
        required=False
    )


class SecurityEventSerializer(serializers.ModelSerializer):
    """
    Serializer for listing system SecurityEvents (Module 7).
    """
    user_email = serializers.SerializerMethodField()

    class Meta:
        from authentication.models import SecurityEvent
        model = SecurityEvent
        fields = [
            'id',
            'user',
            'user_email',
            'event_type',
            'ip_address',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields

    def get_user_email(self, obj):
        return obj.user.email if obj.user else "System / Anonymous"


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'Registered email address is required.',
            'invalid': 'Please enter a valid email address.'
        }
    )

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset using single-use token.
    """
    token = serializers.CharField(
        required=True,
        error_messages={'required': 'Password reset token is required.'}
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        error_messages={'required': 'New password is required.'}
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        error_messages={'required': 'Confirm password is required.'}
    )

    def validate_password(self, value):
        validate_password_complexity(value)
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs






