from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAadhaarProvider(ABC):
    @abstractmethod
    def request_otp(self, aadhaar_number: str) -> str:
        """
        Request OTP verification from UIDAI for a given Aadhaar number.
        Returns a transaction/request ID.
        """
        pass

    @abstractmethod
    def verify_otp(self, transaction_id: str, otp_code: str) -> Dict[str, Any]:
        """
        Verify the OTP code with UIDAI.
        Returns verified demographic claims: first_name, last_name, dob, gender, photo.
        """
        pass


class BaseDigiLockerProvider(ABC):
    @abstractmethod
    def get_authorization_url(self, state: str) -> str:
        """
        Get the DigiLocker OAuth 2.0 authorization URL.
        """
        pass

    @abstractmethod
    def exchange_code_for_tokens(self, auth_code: str) -> Dict[str, Any]:
        """
        Exchange the auth code for access and refresh tokens.
        """
        pass

    @abstractmethod
    def fetch_demographics(self, access_token: str) -> Dict[str, Any]:
        """
        Fetch verified demographics from the voter's DigiLocker vault.
        """
        pass
