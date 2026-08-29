import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone


def generate_verification_token(user):
    """
    Stub helper for Module 4 (Email Verification).
    Generates a secure cryptographically random token string and SHA-256 hash.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = timezone.now() + timedelta(hours=24)
    return {
        'token': raw_token,
        'token_hash': token_hash,
        'expires_at': expires_at
    }
