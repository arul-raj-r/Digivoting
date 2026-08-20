import random
from datetime import timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from authentication.models import User, OTPVerification
from authentication.serializers import LoginSerializer, OTPVerifySerializer, UserSerializer
from authentication.utils import log_event

class LoginThrottle(AnonRateThrottle):
    rate = '15/minute'

class OTPThrottle(AnonRateThrottle):
    rate = '5/minute'

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if not user:
            # Audit log failed login
            # Try to fetch user to link to log
            try:
                failed_user = User.objects.get(username=username)
            except User.DoesNotExist:
                failed_user = None
            log_event(failed_user, 'LOGIN_FAILURE', request, {'attempted_username': username, 'reason': 'Invalid credentials'})
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not user.is_active:
            log_event(user, 'LOGIN_FAILURE', request, {'reason': 'Account disabled'})
            return Response(
                {"error": "This account is inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Directly proceed to session creation (Bypassing OTP and Card Verification)
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Log successful login
        log_event(user, 'LOGIN_SUCCESS', request)
        
        user_data = UserSerializer(user).data
        voter_profile = None
        if user.role == User.VOTER and hasattr(user, 'voter_profile'):
            from voters.serializers import VoterProfileSerializer
            voter = user.voter_profile
            voter_profile = VoterProfileSerializer(voter).data
            
        return Response({
            "access": access_token,
            "refresh": str(refresh),
            "user": user_data,
            "voter_profile": voter_profile
        }, status=status.HTTP_200_OK)


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        otp_code = serializer.validated_data['otp_code']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid request parameters."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the latest unverified OTP
        otp_record = OTPVerification.objects.filter(
            user=user,
            is_verified=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        
        if not otp_record:
            log_event(user, 'OTP_VERIFY_FAILURE', request, {'reason': 'No active OTP found or code expired'})
            return Response(
                {"error": "Verification code expired or does not exist. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check attempts limit
        if otp_record.attempts >= 3:
            log_event(user, 'OTP_VERIFY_FAILURE', request, {'reason': 'Max verification attempts exceeded'})
            return Response(
                {"error": "Maximum attempts exceeded. Please login again to request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verify code
        is_correct = check_password(otp_code, otp_record.otp_code_hash)
        
        if not is_correct:
            otp_record.attempts += 1
            otp_record.save()
            
            remaining = 3 - otp_record.attempts
            log_event(user, 'OTP_VERIFY_FAILURE', request, {'remaining_attempts': remaining})
            
            if remaining <= 0:
                return Response(
                    {"error": "Incorrect code. Maximum attempts reached. Please login again."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"error": f"Incorrect code. {remaining} attempt(s) remaining."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Mark verified
        otp_record.is_verified = True
        otp_record.save()
        
        # If user is a verified voter, require card verification step
        if user.role == User.VOTER and hasattr(user, 'voter_profile') and user.voter_profile.is_verified:
            voter = user.voter_profile
            log_event(user, 'CARD_VERIFICATION_REQUIRED', request)
            return Response({
                "status": "CARD_VERIFICATION_REQUIRED",
                "username": user.username,
                "photo_preview_url": voter.face_photo_url
            }, status=status.HTTP_200_OK)

        # Otherwise, proceed directly to session creation
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Log successful login
        log_event(user, 'LOGIN_SUCCESS', request)
        
        user_data = UserSerializer(user).data
        voter_profile = None
        if user.role == User.VOTER and hasattr(user, 'voter_profile'):
            from voters.serializers import VoterProfileSerializer
            voter = user.voter_profile
            voter_profile = VoterProfileSerializer(voter).data
            
        return Response({
            "access": access_token,
            "refresh": str(refresh),
            "user": user_data,
            "voter_profile": voter_profile
        }, status=status.HTTP_200_OK)


class CardVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        username = request.data.get('username')
        card_number = request.data.get('card_number', '').strip()
        
        if not username or not card_number:
            return Response(
                {"error": "Username and card number are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid request parameters."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the latest verified OTP verification record to ensure user passed OTP
        otp_record = OTPVerification.objects.filter(
            user=user,
            is_verified=True,
            created_at__gt=timezone.now() - timedelta(minutes=10)
        ).order_by('-created_at').first()
        
        if not otp_record:
            return Response(
                {"error": "Session expired or invalid login sequence. Please sign in again."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if otp_record.attempts >= 3:
            otp_record.is_verified = False  # Revoke verification
            otp_record.save()
            log_event(user, 'CARD_VERIFY_FAILURE', request, {'reason': 'Max card verification attempts exceeded'})
            return Response(
                {"error": "Maximum attempts exceeded. Please login again to request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verify card number matches voter's VoterIDCard.card_number
        try:
            voter = user.voter_profile
            if not hasattr(voter, 'voter_id_card') or not voter.voter_id_card:
                log_event(user, 'CARD_VERIFY_FAILURE', request, {'reason': 'No voter card generated'})
                return Response(
                    {"error": "No Voter ID Card generated for this profile. Please contact an administrator."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            correct_card_number = voter.voter_id_card.card_number
        except Voter.DoesNotExist:
            return Response(
                {"error": "Voter profile not found."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if card_number.upper() == correct_card_number.upper():
            # Match: Generate JWT tokens and complete session
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            # Mark OTP record as expired/used
            otp_record.expires_at = timezone.now() - timedelta(seconds=1)
            otp_record.save()
            
            log_event(user, 'LOGIN_SUCCESS', request)
            
            from voters.serializers import VoterProfileSerializer
            voter_profile = VoterProfileSerializer(voter).data
            user_data = UserSerializer(user).data
            
            return Response({
                "access": access_token,
                "refresh": str(refresh),
                "user": user_data,
                "voter_profile": voter_profile
            }, status=status.HTTP_200_OK)
        else:
            # Mismatch: increment failed counter
            otp_record.attempts += 1
            otp_record.save()
            
            remaining = 3 - otp_record.attempts
            log_event(user, 'CARD_VERIFY_FAILURE', request, {'attempts_made': otp_record.attempts, 'remaining': remaining})
            
            if remaining <= 0:
                otp_record.is_verified = False  # Revoke verification
                otp_record.save()
                return Response(
                    {"error": "Card details do not match our records. Maximum attempts reached. Please login again."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            return Response(
                {"error": f"Card details do not match our records. {remaining} attempt(s) remaining."},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user_data = UserSerializer(user).data
        
        voter_profile = None
        if user.role == User.VOTER and hasattr(user, 'voter_profile'):
            from voters.serializers import VoterProfileSerializer
            voter = user.voter_profile
            voter_profile = VoterProfileSerializer(voter).data
            
        return Response({
            "user": user_data,
            "voter_profile": voter_profile
        }, status=status.HTTP_200_OK)


class AIChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        if not message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        msg_lower = message.lower()
        
        # 1. Double voting / vote secrecy
        if any(kw in msg_lower for kw in ['double vote', 'double-voting', 'twice', 'multiple votes', 'prevent', 'fraud', 'vote secrecy', 'anonymous', 'secure', 'security']):
            reply = (
                "🔒 **Double-Voting Prevention & Secrecy Architecture**:\n\n"
                "1. **Decoupled Tables**: When you submit a ballot, two distinct entries are written in an atomic database transaction. "
                "The `VoteReceipt` logs *that* you voted in a specific election (preventing you from voting again). "
                "The `Vote` table stores *who you voted for*, but it is completely disconnected from your identity (no user ID or voter ID is stored).\n"
                "2. **Cryptographic Receipt**: You receive a SHA-256 cryptographic receipt hash (e.g., `RECEIPT: H4X9...`). This allows you to verify that your ballot was entered in the audit ledger, but contains no details revealing *which* candidate you selected."
            )
        # 2. How to vote
        elif any(kw in msg_lower for kw in ['how to vote', 'steps to vote', 'voting terminal', 'process', 'guide']):
            reply = (
                "🗳️ **Step-by-Step Voting Guide**:\n\n"
                "1. **Register**: Go to the 'Register' page, fill in your details, and align your face for the visual audit signature.\n"
                "2. **Wait for Approval**: A system administrator will review your registration and face signature to verify your profile.\n"
                "3. **Login & OTP**: Log in with your username and password. Retrieve the 6-digit OTP from the backend server console and submit it.\n"
                "4. **Go to Dashboard**: Access the 'Voting Portal' from the header, find an active election, and click 'Cast Vote'.\n"
                "5. **Ballot Box**: Select your candidate, verify security prompts, and click 'Submit Ballot'."
            )
        # 3. OTP issues
        elif any(kw in msg_lower for kw in ['otp', 'verification code', 'verify code', 'cooldown', 'login code']):
            reply = (
                "🔑 **OTP Verification Details**:\n\n"
                "1. **Where is it?**: For this development/academic prototype, the OTP is printed directly in the **backend terminal/console logs** as: `[DEMO OTP] Verification code for 'voter1': 123456`.\n"
                "2. **Throttling/Cooldown**: You must wait 60 seconds between resending codes. You have a maximum of 3 entry attempts before you are forced to re-authenticate."
            )
        # 4. Visual Audit / Webcam
        elif any(kw in msg_lower for kw in ['face', 'photo', 'picture', 'camera', 'webcam', 'biometrics', 'liveness']):
            reply = (
                "📸 **Visual Audit & Biometrics**:\n\n"
                "During voter registration, you must align your face within the oval visual guide. "
                "The platform simulates a live blinking check (liveness audit) to confirm a real human is present. "
                "The resulting snapshot is stored as a base64 string in the database. Administrators review this image during the verification step to prevent identity spoofing."
            )
        # 5. Election Status / Candidates
        elif any(kw in msg_lower for kw in ['election', 'elections', 'status', 'candidate', 'candidates', 'active', 'completed', 'scheduled']):
            from elections.models import Election
            active_elections = Election.objects.filter(status=Election.ACTIVE)
            completed_elections = Election.objects.filter(status=Election.COMPLETED)
            scheduled_elections = Election.objects.filter(status=Election.SCHEDULED)
            
            active_list = ", ".join([f"'{e.title}'" for e in active_elections]) or "None"
            completed_list = ", ".join([f"'{e.title}'" for e in completed_elections]) or "None"
            scheduled_list = ", ".join([f"'{e.title}'" for e in scheduled_elections]) or "None"
            
            reply = (
                "📊 **Current Election Status**:\n\n"
                f"* **Active Elections**: {active_list}\n"
                f"* **Scheduled Elections**: {scheduled_list}\n"
                f"* **Completed Elections**: {completed_list}\n\n"
                "To see specific candidate lists, please log in as a verified voter to access your dashboard, or visit the 'Live Standings' page for results."
            )
        # 6. Admin Panel / Management
        elif any(kw in msg_lower for kw in ['admin', 'panel', 'dashboard', 'add candidate', 'create election', 'approve']):
            reply = (
                "💼 **Administrator Operations**:\n\n"
                "If you are logged in with the `admin` account (password `password123`), you can access the **Admin Panel** to:\n"
                "1. Approve or reject pending voter applications.\n"
                "2. Create new elections (Draft, Scheduled, Active, Completed).\n"
                "3. Create new candidates and assign them to constituencies.\n"
                "4. Audit real-time ledger logs (e.g. `LOGIN_SUCCESS`, `VOTE_CAST`).\n"
                "5. Register/modify records directly via Django Admin at `http://localhost:8000/admin/`."
            )
        # Default fallback
        else:
            reply = (
                "👋 Hello! I am your DigiVoting AI Assistant.\n\n"
                "I can help you with:\n"
                "* **How to vote** on this platform.\n"
                "* Understanding **double-voting prevention** and cryptographic vote secrecy.\n"
                "* Finding your **OTP verification code** or fixing **webcam biometrics**.\n"
                "* Listing **active elections** and managing candidates/dashboard.\n\n"
                "What can I help you with today? (Try asking: *'How is double voting prevented?'* or *'How do I vote?'*)"
            )
            
        return Response({"reply": reply}, status=status.HTTP_200_OK)

