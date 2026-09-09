import jwt
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile, LoginAttempt
from accounts.views import DUMMY_PASSWORD_HASH


from django.core.cache import cache

class LoginModuleTests(TestCase):
    """
    Test suite for Module 2 (Login Module) in DigiVote.
    Validates primary factor (email + password) authentication,
    timing-safe enumeration defense, account status gating, atomic attempt logging,
    pre-auth token issuance, and strict security compliance.
    """
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.login_url = '/api/auth/login/'
        
        # 1. Create Active Voter User
        self.active_user = User.objects.create_user(
            username="active_voter",
            email="citizen@digivote.gov.in",
            password="SecurePassword@123",
            phone_number="9876543210",
            email_verified=True,
            account_status='ACTIVE'
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.active_user)
        profile.full_name = "Arul Raj"
        profile.mobile_number = "9876543210"
        profile.save()

        # 2. Create Pending Verification User
        self.pending_user = User.objects.create_user(
            username="pending_voter",
            email="pending@digivote.gov.in",
            password="SecurePassword@123",
            phone_number="9876543211",
            email_verified=False,
            account_status='PENDING_EMAIL_VERIFICATION'
        )

        # 3. Create Suspended User
        self.suspended_user = User.objects.create_user(
            username="suspended_voter",
            email="suspended@digivote.gov.in",
            password="SecurePassword@123",
            phone_number="9876543212",
            email_verified=True,
            account_status='SUSPENDED'
        )

    def test_successful_password_login_issues_pre_auth_token(self):
        """Active citizen provides valid credentials -> gets 5min pre-auth token in PENDING_MFA state."""
        payload = {
            "email": "citizen@digivote.gov.in",
            "password": "SecurePassword@123",
            "remember_device": True
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data.get('auth_state'), 'PENDING_MFA')
        self.assertTrue(response.data.get('mfa_required'))
        
        # Validate pre-auth token
        token = response.data.get('pre_auth_token')
        self.assertIsNotNone(token)
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        self.assertEqual(decoded['user_id'], str(self.active_user.id))
        self.assertEqual(decoded['email'], "citizen@digivote.gov.in")
        self.assertEqual(decoded['token_type'], 'pre_auth')
        self.assertEqual(decoded['state'], 'PENDING_MFA')
        self.assertTrue(decoded['remember_device'])

        # Validate masked identifiers
        dest = response.data.get('destination')
        self.assertIn('masked_email', dest)
        self.assertIn('masked_mobile', dest)
        self.assertEqual(dest['masked_mobile'], '+91 ******3210')

        # Check LoginAttempt record
        attempt = LoginAttempt.objects.filter(email_attempted="citizen@digivote.gov.in").latest('timestamp')
        self.assertTrue(attempt.success)
        self.assertEqual(attempt.user, self.active_user)

    def test_wrong_password_returns_generic_error_and_increments_counter(self):
        """Existing user with wrong password -> returns generic error and increments failed_login_count."""
        payload = {
            "email": "citizen@digivote.gov.in",
            "password": "WrongPassword@999"
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('message'), "Invalid email or password. Please verify your credentials and try again.")

        self.active_user.refresh_from_db()
        self.assertEqual(self.active_user.failed_login_count, 1)
        self.assertIsNotNone(self.active_user.last_login_attempt)

        # Check LoginAttempt log
        attempt = LoginAttempt.objects.filter(email_attempted="citizen@digivote.gov.in").latest('timestamp')
        self.assertFalse(attempt.success)
        self.assertEqual(attempt.failure_reason, "INVALID_PASSWORD")

    def test_nonexistent_email_returns_identical_generic_error(self):
        """Non-existent email -> timing safe comparison returns EXACT same generic 401 error."""
        payload = {
            "email": "nonexistent@digivote.gov.in",
            "password": "AnyPassword@123"
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('message'), "Invalid email or password. Please verify your credentials and try again.")

        # Check LoginAttempt logged with user=None
        attempt = LoginAttempt.objects.filter(email_attempted="nonexistent@digivote.gov.in").latest('timestamp')
        self.assertFalse(attempt.success)
        self.assertIsNone(attempt.user)

    def test_pending_verification_account_rejected_with_403(self):
        """Unverified email account -> returns 403 with specific verification required message."""
        payload = {
            "email": "pending@digivote.gov.in",
            "password": "SecurePassword@123"
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get('code'), 'EMAIL_VERIFICATION_REQUIRED')
        self.assertIn("verify your email", response.data.get('message', '').lower())
        self.assertTrue(response.data.get('resend_available'))

    def test_suspended_account_rejected_with_403(self):
        """Suspended account -> returns 403 with suspension notice."""
        payload = {
            "email": "suspended@digivote.gov.in",
            "password": "SecurePassword@123"
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get('code'), 'ACCOUNT_SUSPENDED')
        self.assertIn("suspended", response.data.get('message', '').lower())

    def test_repeated_failure_warning_threshold(self):
        """After 3 failed attempts, warning metadata indicates remaining attempts before lockout."""
        self.active_user.failed_login_count = 2
        self.active_user.save()

        payload = {
            "email": "citizen@digivote.gov.in",
            "password": "WrongPassword@123"
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('warning', response.data)
        self.assertIn('attempts remaining', response.data['warning'])
        self.assertEqual(response.data['failed_attempts'], 3)

    def test_login_attempts_never_store_plaintext_passwords(self):
        """Ensure sensitive passwords never leak into LoginAttempt records."""
        test_pass = "SuperSecretPasswordDoNotLog!123"
        payload = {
            "email": "citizen@digivote.gov.in",
            "password": test_pass
        }
        self.client.post(self.login_url, payload, format='json')
        
        for attempt in LoginAttempt.objects.all():
            self.assertNotEqual(attempt.failure_reason, test_pass)
            self.assertNotIn(test_pass, str(attempt))
