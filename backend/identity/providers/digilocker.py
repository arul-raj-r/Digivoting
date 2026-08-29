import urllib.parse
from django.conf import settings
from rest_framework.exceptions import ValidationError
from identity.providers.base import BaseDigiLockerProvider

class DigiLockerProvider(BaseDigiLockerProvider):
    def get_authorization_url(self, state: str) -> str:
        client_id = getattr(settings, 'DIGILOCKER_CLIENT_ID', 'mock-client')
        redirect_uri = getattr(settings, 'DIGILOCKER_REDIRECT_URI', 'http://localhost:8000/api/digilocker/callback/')
        
        if getattr(settings, 'DEMO_MODE', True):
            # Demo local redirect URL
            params = {
                "response_type": "code",
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "demo": "true"
            }
            return f"http://localhost:8000/api/v1/digilocker/demo-authorize/?{urllib.parse.urlencode(params)}"

        # Production redirect authorization URL
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state
        }
        return f"https://services.digitallocker.gov.in/oauth/authorize?{urllib.parse.urlencode(params)}"

    def exchange_code_for_tokens(self, auth_code: str) -> dict:
        if getattr(settings, 'DEMO_MODE', True):
            print(f"[DEMO DigiLocker] Exchanged auth code {auth_code} for tokens")
            return {
                "access_token": "demo-access-token-9812",
                "refresh_token": "demo-refresh-token-8910",
                "expires_in": 3600
            }

        # Production exchange token POST request
        raise NotImplementedError("Production DigiLocker token exchange requires API credentials.")

    def fetch_demographics(self, access_token: str) -> dict:
        if getattr(settings, 'DEMO_MODE', True):
            print(f"[DEMO DigiLocker] Querying verified documents using token {access_token}")
            import random
            random_digits = "".join(random.choices("0123456789", k=6))
            return {
                "first_name": "Ramesh",
                "last_name": "Kumar",
                "date_of_birth": "1990-03-24",
                "gender": "Male",
                "voter_id_number": f"VT{random_digits}",
                "photo_url": "https://api.dicebear.com/7.x/initials/svg?seed=Ramesh"
            }

        # Production retrieve demographics client requests
        raise NotImplementedError("Production DigiLocker query requires API credentials.")
