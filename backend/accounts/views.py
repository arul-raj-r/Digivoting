import secrets
import logging
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.throttling import AnonRateThrottle

from authentication.models import User, UserProfile
from accounts.serializers import RegisterSerializer, UserSerializer
from accounts.utils import generate_verification_token

logger = logging.getLogger(__name__)


class RegisterRateThrottle(AnonRateThrottle):
    """
    Rate limit throttle to prevent registration spam / bot account flooding.
    """
    rate = '15/minute'


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Module 1: User Registration Endpoint.
    - Validates all fields server-side with strict password complexity rules.
    - Performs case-insensitive email check and mobile uniqueness check.
    - Returns structured 409 Conflict if account already exists.
    - Hashes password using Django's built-in PBKDF2/Argon2 hasher.
    - Creates user with status='pending_verification' and is_email_verified=False.
    - Returns 201 Created with sanitized user payload (no password/hashes leaked).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            # Format first validation error cleanly
            errors = serializer.errors
            first_field = next(iter(errors))
            raw_msg = errors[first_field]
            msg = raw_msg[0] if isinstance(raw_msg, list) else str(raw_msg)
            return Response({
                "success": False,
                "field": first_field,
                "message": msg,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        email = validated['email']
        mobile_number = validated['mobile_number']
        full_name = validated['full_name']
        password = validated['password']

        # 1. Check duplicate email (case-insensitive) -> 409 Conflict
        if User.objects.filter(email__iexact=email).exists():
            return Response({
                "success": False,
                "field": "email",
                "message": "This email is already registered — try logging in instead."
            }, status=status.HTTP_409_CONFLICT)

        # 2. Check duplicate mobile number -> 409 Conflict
        # Check both User and UserProfile / phone fields
        mobile_exists = (
            User.objects.filter(phone_number=mobile_number).exists() or
            UserProfile.objects.filter(mobile_number=mobile_number).exists()
        )
        if mobile_exists:
            return Response({
                "success": False,
                "field": "mobile_number",
                "message": "This mobile number is already registered with another account."
            }, status=status.HTTP_409_CONFLICT)

        try:
            with transaction.atomic():
                # Derive safe username internally from email prefix
                base_username = email.split('@')[0]
                unique_suffix = secrets.token_hex(4)
                username = f"{base_username}_{unique_suffix}"

                # Parse first/last name safely for AbstractUser fields
                name_parts = full_name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ''

                # Secure user creation with hashed password
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=mobile_number,
                    role=User.VOTER,
                    account_status='PENDING_EMAIL_VERIFICATION',
                    email_verified=False
                )

                # Attach profile information
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.full_name = full_name
                profile.mobile_number = mobile_number
                profile.save()

                # Generate token stub for Module 4 (Email Verification)
                token_data = generate_verification_token(user)
                logger.info("Generated pending verification stub for user: %s", email)

                # Construct sanitized output object (no password fields included)
                user_data = {
                    "id": str(user.id),
                    "full_name": full_name,
                    "email": user.email,
                    "mobile_number": mobile_number,
                    "status": "pending_verification",
                    "is_email_verified": False,
                    "date_joined": user.created_at if hasattr(user, 'created_at') else user.date_joined
                }

                return Response({
                    "success": True,
                    "message": "Account registered successfully. Please verify your email address to proceed.",
                    "user": user_data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("Registration error: %s", str(e), exc_info=True)
            return Response({
                "success": False,
                "message": "Registration could not be completed. Please try again later."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
