from django.conf import settings
from rest_framework.exceptions import ValidationError
from identity.providers.base import BaseAadhaarProvider
import uuid

class AadhaarProvider(BaseAadhaarProvider):
    def request_otp(self, aadhaar_number: str) -> str:
        if not aadhaar_number or len(aadhaar_number) != 12 or not aadhaar_number.isdigit():
            raise ValidationError("Invalid Aadhaar number format. Must be 12 digits.")
        
        # In demo mode, generate a fake transaction identifier
        if getattr(settings, 'DEMO_MODE', True):
            tx_id = f"demo-tx-{uuid.uuid4().hex[:8]}"
            print(f"[DEMO Aadhaar] OTP request generated for Aadhaar {aadhaar_number}. Transaction ID: {tx_id}")
            return tx_id
            
        # Production API call integration logic goes here
        raise NotImplementedError("Production Aadhaar API integrations require provider credentials.")

    def verify_otp(self, transaction_id: str, otp_code: str) -> dict:
        if not otp_code or len(otp_code) != 6 or not otp_code.isdigit():
            raise ValidationError("OTP must be a 6-digit numeric code.")

        if getattr(settings, 'DEMO_MODE', True):
            if otp_code == "123456":  # Standard demo OTP
                print(f"[DEMO Aadhaar] OTP verification successful for transaction {transaction_id}")
                return {
                    "first_name": "Priya",
                    "last_name": "Dharshini",
                    "date_of_birth": "1994-05-12",
                    "gender": "Female",
                    "voter_id_number": "VT982002",
                    "photo_url": "https://api.dicebear.com/7.x/initials/svg?seed=Priya"
                }
            else:
                raise ValidationError("Incorrect Aadhaar OTP. Use '123456' for demo.")
                
        # Production API verification logic goes here
        raise NotImplementedError("Production Aadhaar API integrations require provider credentials.")
