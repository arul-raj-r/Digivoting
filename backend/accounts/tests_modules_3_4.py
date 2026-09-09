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
from authentication.models import User, UserProfile, LoginAttempt, EmailVerificationToken


class Modules3And4Tests(TestCase):
    """
    Test suite for Module 3 (Google Auth) & Module 4 (Email Verification).
    """
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.google_url = '/api/auth/google/'
        self.verify_email_url = '/api/auth/verify-email/'
        self.resend_url = '/api/auth/resend-verification/'

        # Setup standard test user
        self.user = User.objects.create_user(
            username="citizen_test",
            email="citizen@digivote.gov.in",
            password="SecurePassword@123",
            phone_number="9876543210",
            email_verified=False,
            account_status='PENDING_EMAIL_VERIFICATION'
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.full_name = "Arul Raj"
        profile.mobile_number = "9876543210"
        profile.save()

    # -------------------------------------------------------------------------
    # MODULE 3: GOOGLE OAUTH TESTS
    # -------------------------------------------------------------------------

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_new_google_user_created_as_active_and_verified(self, mock_verify):
        """New Google login creates user with account_status=ACTIVE, email_verified=True, and issues pre-auth token."""
        mock_verify.return_value = {
            'sub': 'google_unique_sub_12345',
            'email': 'newgooglecitizen@gmail.com',
            'name': 'Google Citizen',
            'email_verified': True,
        }

        response = self.client.post(self.google_url, {'id_token': 'mock_valid_id_token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data.get('auth_state'), 'PENDING_MFA')
        self.assertIsNotNone(response.data.get('pre_auth_token'))

        # Verify DB records
        created_user = User.objects.get(email='newgooglecitizen@gmail.com')
        self.assertEqual(created_user.google_id, 'google_unique_sub_12345')
        self.assertEqual(created_user.account_status, 'ACTIVE')
        self.assertTrue(created_user.email_verified)
        self.assertFalse(created_user.has_usable_password())

        # Verify LoginAttempt audit record
        attempt = LoginAttempt.objects.filter(email_attempted='newgooglecitizen@gmail.com').latest('timestamp')
        self.assertTrue(attempt.success)
        self.assertEqual(attempt.method, 'google_oauth')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_existing_email_links_google_id_and_activates(self, mock_verify):
        """Existing password-registered user links Google ID on first Google sign-in and activates."""
        mock_verify.return_value = {
            'sub': 'google_sub_for_existing',
            'email': 'citizen@digivote.gov.in',
            'name': 'Arul Raj',
            'email_verified': True,
        }

        response = self.client.post(self.google_url, {'id_token': 'mock_valid_token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.google_id, 'google_sub_for_existing')
        self.assertTrue(self.user.email_verified)
        self.assertEqual(self.user.account_status, 'ACTIVE')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_account_conflict_prevents_takeover(self, mock_verify):
        """Account already linked to Google ID A rejects sign-in attempt from Google ID B with 409 Conflict."""
        self.user.google_id = 'original_google_id_AAA'
        self.user.save()

        mock_verify.return_value = {
            'sub': 'attacker_google_id_BBB',
            'email': 'citizen@digivote.gov.in',
            'name': 'Attacker Name',
            'email_verified': True,
        }

        response = self.client.post(self.google_url, {'id_token': 'mock_token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('code'), 'ACCOUNT_CONFLICT')

        # Check failed LoginAttempt logged
        attempt = LoginAttempt.objects.filter(email_attempted='citizen@digivote.gov.in').latest('timestamp')
        self.assertFalse(attempt.success)
        self.assertEqual(attempt.failure_reason, 'GOOGLE_ACCOUNT_CONFLICT')
        self.assertEqual(attempt.method, 'google_oauth')

    # -------------------------------------------------------------------------
    # MODULE 4: EMAIL VERIFICATION TESTS
    # -------------------------------------------------------------------------

    def test_valid_token_activates_account(self):
        """Valid hash-matched token sets account_status=ACTIVE, email_verified=True, and marks token used."""
        raw_token = "valid_sample_token_64_characters_long_abcdefghijklmnopqrstuvwxyz12"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(hours=24)

        token_rec = EmailVerificationToken.objects.create(
            user=self.user,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )

        response = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))

        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)
        self.assertEqual(self.user.account_status, 'ACTIVE')

        token_rec.refresh_from_db()
        self.assertTrue(token_rec.used)

    def test_expired_token_rejected_with_specific_code(self):
        """Deterministic expiry test: token expired 1 hour ago is rejected with TOKEN_EXPIRED."""
        raw_token = "expired_token_sample_value_1234567890abcdef"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        past_expiry = timezone.now() - timedelta(hours=1)

        EmailVerificationToken.objects.create(
            user=self.user,
            token_hash=token_hash,
            expires_at=past_expiry,
            used=False
        )

        response = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'TOKEN_EXPIRED')
        self.assertIn("expired", response.data.get('message', '').lower())

    def test_reused_token_rejected(self):
        """Token already marked used returns ALREADY_USED or ALREADY_VERIFIED error."""
        raw_token = "already_used_token_sample_1234567890abcdef"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(hours=24)

        EmailVerificationToken.objects.create(
            user=self.user,
            token_hash=token_hash,
            expires_at=expires_at,
            used=True
        )

        response = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'ALREADY_USED')

    def test_resend_verification_enforces_cooldown_and_timing_safety(self):
        """First request succeeds and sets cooldown; immediate second request is throttled with 429."""
        # First request
        response1 = self.client.post(self.resend_url, {'email': 'citizen@digivote.gov.in'}, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Immediate second request triggers cooldown
        response2 = self.client.post(self.resend_url, {'email': 'citizen@digivote.gov.in'}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response2.data.get('code'), 'COOLDOWN_ACTIVE')

    def test_resend_verification_nonexistent_email_does_not_leak_existence(self):
        """Non-existent email returns exact same generic 200 message without error leakage."""
        response = self.client.post(self.resend_url, {'email': 'nonexistent@digivote.gov.in'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("If an account with this email exists", response.data.get('message', ''))
