import jwt
import hashlib
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile, LoginAttempt, OTPCode
from accounts.views import generate_pre_auth_token


class Module5OTPTests(TestCase):
    """
    Test suite for Module 5: OTP Authentication & MFA Gateway.
    """
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.send_otp_url = '/api/auth/otp/send/'
        self.verify_otp_url = '/api/auth/otp/verify/'
        self.resend_otp_url = '/api/auth/otp/resend/'

        # Setup standard active citizen user
        self.user = User.objects.create_user(
            username="citizen_mfa",
            email="mfa.citizen@digivote.gov.in",
            password="SecurePassword@123",
            phone_number="9876543210",
            email_verified=True,
            account_status='ACTIVE'
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.full_name = "Kavitha Raman"
        profile.mobile_number = "9876543210"
        profile.save()

        # Generate fresh pre-auth token
        self.pre_auth_token, self.expires_at = generate_pre_auth_token(self.user)

    def test_send_otp_dispatches_email_and_stores_hash_only(self):
        """Requesting OTP creates a hashed record (never plaintext) and sets 30s cooldown."""
        response = self.client.post(self.send_otp_url, {'pre_auth_token': self.pre_auth_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertIn("masked_email", response.data.get('destination', {}))

        # Check DB record has code_hash
        otp_rec = OTPCode.objects.filter(user=self.user, used=False).first()
        self.assertIsNotNone(otp_rec)
        self.assertEqual(len(otp_rec.code_hash), 64) # SHA-256 length
        self.assertEqual(otp_rec.attempt_count, 0)
        self.assertEqual(otp_rec.max_attempts, getattr(settings, 'OTP_MAX_ATTEMPTS', 3))


        # Immediate second send hits 30s cooldown
        res2 = self.client.post(self.send_otp_url, {'pre_auth_token': self.pre_auth_token}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(res2.data.get('code'), 'COOLDOWN_ACTIVE')

    def test_verify_otp_success_issues_full_session_and_audit_mfa(self):
        """Correct 6-digit OTP issues SimpleJWT access+refresh tokens, marks OTP used, and sets mfa_completed=True."""
        raw_code = "654321"
        code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=5)

        OTPCode.objects.create(
            user=self.user,
            code_hash=code_hash,
            expires_at=expires_at,
            attempt_count=0,
            max_attempts=5,
            used=False
        )

        response = self.client.post(self.verify_otp_url, {
            'pre_auth_token': self.pre_auth_token,
            'otp_code': raw_code
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data.get('auth_state'), 'AUTHENTICATED')
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])

        # Check LoginAttempt audit record
        attempt = LoginAttempt.objects.filter(email_attempted=self.user.email).latest('timestamp')
        self.assertTrue(attempt.success)
        self.assertTrue(attempt.mfa_completed)

        # Check pre-auth token is consumed (single-use)
        reused_res = self.client.post(self.verify_otp_url, {
            'pre_auth_token': self.pre_auth_token,
            'otp_code': raw_code
        }, format='json')
        self.assertEqual(reused_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(reused_res.data.get('code'), 'PRE_AUTH_REUSED')

    def test_verify_otp_wrong_code_increments_attempts(self):
        """Incorrect OTP increments attempt_count and displays remaining attempts."""
        raw_code = "123456"
        code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=5)

        otp_rec = OTPCode.objects.create(
            user=self.user,
            code_hash=code_hash,
            expires_at=expires_at,
            attempt_count=0,
            max_attempts=5,
            used=False
        )

        response = self.client.post(self.verify_otp_url, {
            'pre_auth_token': self.pre_auth_token,
            'otp_code': "999999" # Incorrect code
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'INVALID_OTP')
        self.assertEqual(response.data.get('attempts_remaining'), 4)

        otp_rec.refresh_from_db()
        self.assertEqual(otp_rec.attempt_count, 1)

    def test_verify_otp_exceeding_max_attempts_locks_session(self):
        """Reaching max 5 attempts invalidates the OTP and pre-auth session."""
        raw_code = "123456"
        code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=5)

        OTPCode.objects.create(
            user=self.user,
            code_hash=code_hash,
            expires_at=expires_at,
            attempt_count=4, # 1 attempt remaining
            max_attempts=5,
            used=False
        )

        response = self.client.post(self.verify_otp_url, {
            'pre_auth_token': self.pre_auth_token,
            'otp_code': "000000"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('code'), 'MAX_ATTEMPTS_EXCEEDED')

    def test_verify_otp_expired_code_rejected(self):
        """Expired OTP code returns OTP_EXPIRED."""
        raw_code = "123456"
        code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
        past_expiry = timezone.now() - timedelta(minutes=1)

        OTPCode.objects.create(
            user=self.user,
            code_hash=code_hash,
            expires_at=past_expiry,
            attempt_count=0,
            max_attempts=5,
            used=False
        )

        response = self.client.post(self.verify_otp_url, {
            'pre_auth_token': self.pre_auth_token,
            'otp_code': raw_code
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'OTP_EXPIRED')
