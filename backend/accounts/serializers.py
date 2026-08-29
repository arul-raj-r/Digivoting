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
    class Meta:
        model = User
        fields = (
            'id',
            'full_name',
            'email',
            'mobile_number',
            'status',
            'is_email_verified',
            'date_joined'
        )
        read_only_fields = fields


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
