from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from audit.models import AuditLog

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "success": True,
            "message": "DigiVote backend is running"
        }, status=status.HTTP_200_OK)


class DatabaseHealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
            
            if row and row[0] == 1:
                return Response({
                    "success": True,
                    "message": "Database is connected and operational"
                }, status=status.HTTP_200_OK)
            
            return Response({
                "success": False,
                "message": "Database query returned unexpected result"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception:
            return Response({
                "success": False,
                "message": "Database connectivity check failed"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class SystemConfigView(APIView):
    """
    Backend-controlled configuration foundation.
    Provides verified platform settings, enabled features, security constraints,
    and institutional branding to the frontend.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "success": True,
            "application_name": "DigiVote",
            "tagline": "Secure Digital Voting Platform",
            "organization_name": "DigiVote Election Governance",
            "version": "1.0.0",
            "features": {
                "face_verification": True,
                "email_otp": True,
                "google_oauth": True,
                "audit_logging": True,
                "ai_chatbot": False
            },
            "security": {
                "otp_timeout_seconds": 300,
                "otp_resend_cooldown_seconds": 30,
                "max_otp_attempts": 3,
                "session_timeout_minutes": 60,
                "face_verification_threshold": 0.65
            },
            "theme_defaults": {
                "default_mode": "system",
                "available_modes": ["light", "dark", "system"]
            },
            "contact_info": {
                "support_email": "support@digivote.org",
                "portal_type": "Institutional Election Governance Platform"
            }
        }, status=status.HTTP_200_OK)


class ContactSubmissionView(APIView):
    """
    Accepts legitimate contact inquiries, validates required fields,
    and logs the event to audit logging.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        subject = request.data.get('subject', '').strip()
        message = request.data.get('message', '').strip()

        errors = {}
        if not name:
            errors['name'] = "Name is required."
        if not email or '@' not in email:
            errors['email'] = "A valid email address is required."
        if not subject:
            errors['subject'] = "Subject is required."
        if not message:
            errors['message'] = "Message content is required."

        if errors:
            return Response({
                "success": False,
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Log contact form submission event
        try:
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
            AuditLog.objects.create(
                event_type="CONTACT_INQUIRY_SUBMITTED",
                severity="INFO",
                result="SUCCESS",
                ip_address=client_ip.split(',')[0].strip() if client_ip else None,
                metadata={
                    "name": name,
                    "email": email,
                    "subject": subject,
                }
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": "Thank you for reaching out. Your inquiry has been received by the DigiVote team."
        }, status=status.HTTP_200_OK)

