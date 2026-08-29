import secrets
import hashlib
from django.utils import timezone
from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError
from django.db import transaction

from authentication.views import api_success, api_error
from authentication.utils import log_event
from locations.models import Constituency
from voters.models import VoterProfile, VoterIDCard
from identity.providers.digilocker import DigiLockerProvider

class DigiLockerUrlView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        state = request.query_params.get('state') or secrets.token_hex(16)
        provider = DigiLockerProvider()
        url = provider.get_authorization_url(state)
        return api_success({"url": url})

class DigiLockerCallbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        state = request.data.get('state')

        if not code:
            return api_error("VALIDATION_ERROR", "Authorization code is required.")

        provider = DigiLockerProvider()
        
        try:
            tokens = provider.exchange_code_for_tokens(code)
            demographics = provider.fetch_demographics(tokens['access_token'])
        except Exception as e:
            return api_error("VERIFICATION_FAILED", f"Failed to authenticate with DigiLocker: {str(e)}")

        with transaction.atomic():
            profile, _ = VoterProfile.objects.get_or_create(user=request.user)
            
            # Select default constituency (or first one)
            constituency = Constituency.objects.order_by('id').first()
            if not constituency:
                return api_error("CONFIGURATION_ERROR", "No constituencies are configured in the system.")

            profile.verification_status = 'VERIFIED'
            profile.voter_reference = demographics['voter_id_number']
            profile.verification_method = 'DIGILOCKER'
            profile.verified_at = timezone.now()
            profile.constituency = constituency
            profile.date_of_birth = demographics['date_of_birth']
            profile.gender = demographics['gender']
            profile.face_photo_url = demographics['photo_url']
            profile.save()

            # Create ID Card
            VoterIDCard.objects.get_or_create(
                voter=profile,
                defaults={
                    'card_number': demographics['voter_id_number'],
                    'full_name': f"{demographics['first_name']} {demographics['last_name']}",
                    'date_of_birth': profile.date_of_birth,
                    'gender': profile.gender,
                    'constituency': constituency,
                    'photo_url': profile.face_photo_url,
                    'qr_code_data': f"{demographics['voter_id_number']}:{profile.id}",
                    'status': 'ACTIVE'
                }
            )

            # Update User fields if needed
            user = request.user
            user.first_name = demographics['first_name']
            user.last_name = demographics['last_name']
            user.save()

            log_event(user, 'IDENTITY_VERIFIED', request, {'method': 'DIGILOCKER', 'voter_id': demographics['voter_id_number']})

        return api_success({"message": "DigiLocker verification completed successfully."})


class DigiLockerDemoAuthorizeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        client_id = request.GET.get('client_id')
        redirect_uri = request.GET.get('redirect_uri')
        state = request.GET.get('state')
        
        # HTML for a beautiful mock portal
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DigiLocker Mock Consent Portal</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {{
                    font-family: 'Inter', sans-serif;
                    background-color: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 16px;
                }}
                .card {{
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.05);
                    max-width: 480px;
                    width: 100%;
                    padding: 32px;
                    box-sizing: border-box;
                }}
                .header {{
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 20px;
                    margin-bottom: 24px;
                }}
                .logo {{
                    width: 48px;
                    height: 48px;
                    background-color: #0f172a;
                    color: #fbbf24;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 20px;
                }}
                .logo-text {{
                    font-size: 20px;
                    font-weight: 700;
                    color: #0f172a;
                }}
                .subtitle {{
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 2px;
                }}
                .permissions {{
                    background-color: #f8fafc;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 28px;
                    border: 1px dashed #cbd5e1;
                }}
                .permissions-title {{
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }}
                .permission-item {{
                    font-size: 12px;
                    color: #475569;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}
                .permission-item::before {{
                    content: "✓";
                    color: #10b981;
                    font-weight: bold;
                }}
                .actions {{
                    display: flex;
                    gap: 12px;
                }}
                .btn {{
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    text-decoration: none;
                }}
                .btn-primary {{
                    background-color: #2563eb;
                    color: white;
                }}
                .btn-primary:hover {{
                    background-color: #1d4ed8;
                }}
                .btn-secondary {{
                    background-color: #f1f5f9;
                    color: #475569;
                }}
                .btn-secondary:hover {{
                    background-color: #e2e8f0;
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <div class="logo">DL</div>
                    <div>
                        <div class="logo-text">DigiLocker</div>
                        <div class="subtitle">Ministry of Electronics & IT, Government of India</div>
                    </div>
                </div>
                
                <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Grant Access Consent</h3>
                <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
                    <strong>DigiVote Portal</strong> is requesting authorization to retrieve documents from your verified DigiLocker vault.
                </p>
                
                <div class="permissions">
                    <div class="permissions-title">Requested Access Permissions:</div>
                    <div class="permission-item">Basic Profile Information (Name, Date of Birth, Gender)</div>
                    <div class="permission-item">Digital Voter ID Card (e-EPIC) Document Details</div>
                </div>
                
                <div class="actions">
                    <a href="{redirect_uri}?code=demo-code-auth-123456&state={state}" class="btn btn-primary">Approve & Authenticate</a>
                    <a href="{redirect_uri}?error=access_denied&state={state}" class="btn btn-secondary">Deny Access</a>
                </div>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')
