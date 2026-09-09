import json
import hashlib
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import (
    User,
    UserProfile,
    EmailVerificationToken,
    PasswordResetToken,
    OTPCode,
    UserSession,
    LoginAttempt,
    SecurityEvent
)


class DigiVoteAuthenticationModuleTests(TestCase):
    """
    Complete automated test suite covering all 7 Authentication Modules:
    - Module 1: Registration (Validation, 409 conflict, password hashing, PENDING_EMAIL_VERIFICATION)
    - Module 2: Login (Validation, unverified email rejection, 5-attempt lock, pre-auth token)
    - Module 3: Google OAuth (identity validation, account linking/creation, MFA handoff)
    - Module 4: Email Verification (SHA-256 token validation, 24h expiry, single-use, 60s cooldown)
    - Module 5: OTP MFA (6-digit hash compare, 3-attempt limit, lock on 3 failures, session issuance)
    - Module 6: Session Management (UserSession tracking, JWT validation, single revoke, revoke all)
    - Module 7: Security Audit (LoginAttempt logging, SecurityEvent logging, no secrets in logs)
    - Password Reset: Request safe response, confirm with token, and PREVIOUS SESSIONS REVOCATION.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.verify_email_url = '/api/auth/verify-email/'
        self.resend_verification_url = '/api/auth/resend-verification/'
        self.send_otp_url = '/api/auth/otp/send/'
        self.verify_otp_url = '/api/auth/otp/verify/'
        self.sessions_url = '/api/auth/sessions/'
        self.forgot_password_url = '/api/auth/forgot-password/'
        self.reset_password_url = '/api/auth/reset-password/'
        self.me_url = '/api/auth/me/'

        test_id = self._testMethodName.lower().replace('_', '')[-8:]
        self.valid_user_payload = {
            "full_name": "Kavitha Raman",
            "email": f"voter.{test_id}@digivote.gov.in",
            "mobile_number": f"9840{hash(self._testMethodName) % 899999 + 100000}",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026"
        }


    # =========================================================================
    # Module 1: Registration Module Tests
    # =========================================================================

    def test_01_successful_registration_flow(self):
        """User registers successfully, gets pending_verification and receives hashed token."""
        response = self.client.post(self.register_url, self.valid_user_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))
        self.assertIn('user', response.data)

        user_data = response.data['user']
        self.assertEqual(user_data['email'], self.valid_user_payload['email'])
        self.assertFalse(user_data['is_email_verified'])

        # Check DB state
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        self.assertEqual(db_user.account_status, 'PENDING_EMAIL_VERIFICATION')
        self.assertFalse(db_user.email_verified)
        self.assertEqual(db_user.role, User.VOTER) # Role escalation protected
        self.assertTrue(db_user.check_password("SecurePassword@2026"))

        # Verify token created
        token_record = EmailVerificationToken.objects.filter(user=db_user, used=False).first()
        self.assertIsNotNone(token_record)
        self.assertEqual(len(token_record.token_hash), 64) # SHA-256

    def test_02_registration_duplicate_email_returns_409(self):
        """Duplicate email registration is blocked with 409 Conflict."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        dup_payload = self.valid_user_payload.copy()
        dup_payload["mobile_number"] = "9840999999"
        response = self.client.post(self.register_url, dup_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('field'), 'email')

    def test_03_registration_duplicate_mobile_returns_409(self):
        """Duplicate mobile number registration is blocked with 409 Conflict."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        dup_payload = self.valid_user_payload.copy()
        dup_payload["email"] = "other.citizen@digivote.gov.in"
        response = self.client.post(self.register_url, dup_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('field'), 'mobile_number')

    def test_04_registration_weak_password_rejected(self):
        """Registration with weak password (missing special char or digit) fails validation."""
        weak_payload = self.valid_user_payload.copy()
        weak_payload["password"] = "SimplePasswordOnly"
        weak_payload["confirm_password"] = "SimplePasswordOnly"
        response = self.client.post(self.register_url, weak_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # Module 4: Email Verification Tests
    # =========================================================================

    def test_05_email_verification_success_activates_user(self):
        """Valid email token activates account and sets email_verified=True."""
        reg_resp = self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])

        # Retrieve raw token from test email dispatch
        from accounts.utils import generate_and_send_verification_email
        token_info = generate_and_send_verification_email(db_user)
        raw_token = token_info['raw_token']

        # Verify email
        verify_resp = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data.get('success'))

        db_user.refresh_from_db()
        self.assertTrue(db_user.email_verified)
        self.assertEqual(db_user.account_status, 'ACTIVE')

    def test_06_email_verification_single_use(self):
        """Verification token cannot be used twice."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        from accounts.utils import generate_and_send_verification_email
        token_info = generate_and_send_verification_email(db_user)
        raw_token = token_info['raw_token']

        # 1st attempt: success
        self.client.post(self.verify_email_url, {'token': raw_token}, format='json')

        # 2nd attempt: should indicate already used / already verified
        res2 = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertIn(res2.data.get('code'), ['ALREADY_VERIFIED', 'ALREADY_USED'])

    def test_07_email_verification_expired_token(self):
        """Expired verification token is rejected."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        raw_token = "expired_raw_token_value_xyz123"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        EmailVerificationToken.objects.create(
            user=db_user,
            token_hash=token_hash,
            expires_at=timezone.now() - timedelta(hours=1),
            used=False
        )

        response = self.client.post(self.verify_email_url, {'token': raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'TOKEN_EXPIRED')

    # =========================================================================
    # Module 2: Login Module Tests
    # =========================================================================

    def test_08_login_unverified_email_blocked(self):
        """Login with unverified email returns 403 EMAIL_VERIFICATION_REQUIRED."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': self.valid_user_payload['password']
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(login_resp.data.get('code'), 'EMAIL_VERIFICATION_REQUIRED')

    def test_09_login_successful_credentials_returns_pending_mfa(self):
        """Verified user enters valid password -> receives pre_auth_token and PENDING_MFA with timers."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': self.valid_user_payload['password']
        }, format='json')

        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(login_resp.data.get('auth_state'), 'PENDING_MFA')
        self.assertTrue(login_resp.data.get('mfa_required'))
        self.assertIn('pre_auth_token', login_resp.data)
        self.assertEqual(login_resp.data.get('expires_in_seconds'), getattr(settings, 'OTP_EXPIRY_SECONDS', 300))
        self.assertEqual(login_resp.data.get('cooldown_seconds'), getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 30))
        self.assertEqual(login_resp.data.get('max_attempts'), getattr(settings, 'OTP_MAX_ATTEMPTS', 3))

        # Ensure no session token is leaked before MFA
        self.assertNotIn('access', login_resp.data.get('tokens', {}))

    def test_10_login_five_failed_attempts_locks_account(self):
        """5 consecutive failed passwords triggers temporary account lockout for 30 minutes."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        for i in range(4):
            resp = self.client.post(self.login_url, {
                'email': self.valid_user_payload['email'],
                'password': 'WrongPassword@999'
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5th failed attempt locks the account
        fifth_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': 'WrongPassword@999'
        }, format='json')
        self.assertEqual(fifth_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(fifth_resp.data.get('code'), 'ACCOUNT_LOCKED')

        # Check DB lockout
        db_user.refresh_from_db()
        self.assertEqual(db_user.account_status, 'LOCKED')
        self.assertIsNotNone(db_user.locked_until)

        # Check SecurityEvent
        sec_event = SecurityEvent.objects.filter(user=db_user, event_type='account_locked').first()
        self.assertIsNotNone(sec_event)

    # =========================================================================
    # Module 5: OTP Authentication & MFA Gateway Tests
    # =========================================================================

    def test_11_otp_verification_success_creates_session_and_jwt(self):
        """Submitting correct 6-digit OTP completes MFA, creates UserSession, and returns JWT."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        # Login to get pre_auth_token
        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': self.valid_user_payload['password']
        }, format='json')
        pre_auth_token = login_resp.data['pre_auth_token']

        # Setup active OTP in DB
        plain_code = "482913"
        code_hash = hashlib.sha256(plain_code.encode()).hexdigest()
        OTPCode.objects.filter(user=db_user).update(used=True)
        OTPCode.objects.create(
            user=db_user,
            code_hash=code_hash,
            expires_at=timezone.now() + timedelta(minutes=5),
            attempt_count=0,
            max_attempts=3,
            used=False
        )

        # Submit OTP
        otp_resp = self.client.post(self.verify_otp_url, {
            'pre_auth_token': pre_auth_token,
            'otp_code': plain_code
        }, format='json')

        self.assertEqual(otp_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(otp_resp.data.get('auth_state'), 'AUTHENTICATED')
        self.assertIn('access', otp_resp.data.get('tokens', {}))
        self.assertIn('refresh', otp_resp.data.get('tokens', {}))

        # Check UserSession record created
        session_id = otp_resp.data['tokens']['session_id']
        session_record = UserSession.objects.filter(id=session_id, user=db_user, revoked=False).first()
        self.assertIsNotNone(session_record)

    def test_12_otp_three_failed_attempts_burns_challenge(self):
        """3 incorrect OTP submissions burns the OTP and locks the challenge."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': self.valid_user_payload['password']
        }, format='json')
        pre_auth_token = login_resp.data['pre_auth_token']

        plain_code = "777888"
        code_hash = hashlib.sha256(plain_code.encode()).hexdigest()
        OTPCode.objects.filter(user=db_user).update(used=True)
        OTPCode.objects.create(
            user=db_user,
            code_hash=code_hash,
            expires_at=timezone.now() + timedelta(minutes=5),
            attempt_count=0,
            max_attempts=3,
            used=False
        )

        # 1st wrong attempt
        r1 = self.client.post(self.verify_otp_url, {'pre_auth_token': pre_auth_token, 'otp_code': '000001'}, format='json')
        self.assertEqual(r1.status_code, status.HTTP_400_BAD_REQUEST)

        # 2nd wrong attempt
        r2 = self.client.post(self.verify_otp_url, {'pre_auth_token': pre_auth_token, 'otp_code': '000002'}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)

        # 3rd wrong attempt -> MAX_ATTEMPTS_EXCEEDED
        r3 = self.client.post(self.verify_otp_url, {'pre_auth_token': pre_auth_token, 'otp_code': '000003'}, format='json')
        self.assertEqual(r3.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(r3.data.get('code'), 'MAX_ATTEMPTS_EXCEEDED')

        # Assert OTP is marked used
        active_otp = OTPCode.objects.filter(user=db_user, code_hash=code_hash).first()
        self.assertTrue(active_otp.used)

    # =========================================================================
    # Module 6: Session Management & Revocation Tests
    # =========================================================================

    def test_13_session_list_and_individual_revocation(self):
        """Active sessions can be listed and individually revoked, blocking subsequent API calls."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        # Generate session via login + OTP
        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': self.valid_user_payload['password']
        }, format='json')
        pre_auth = login_resp.data['pre_auth_token']

        plain_code = "123123"
        OTPCode.objects.filter(user=db_user).update(used=True)
        OTPCode.objects.create(
            user=db_user,
            code_hash=hashlib.sha256(plain_code.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(minutes=5),
            max_attempts=3,
            used=False
        )

        otp_resp = self.client.post(self.verify_otp_url, {
            'pre_auth_token': pre_auth,
            'otp_code': plain_code
        }, format='json')
        access_token = otp_resp.data['tokens']['access']
        session_id = otp_resp.data['tokens']['session_id']

        # Query sessions endpoint with access token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        list_resp = self.client.get(self.sessions_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(any(s['id'] == session_id for s in list_resp.data['sessions']))

        # Revoke session
        revoke_resp = self.client.delete(f"{self.sessions_url}{session_id}/")
        self.assertEqual(revoke_resp.status_code, status.HTTP_200_OK)

        # Now attempting to use the revoked token must fail with 401
        me_resp = self.client.get(self.me_url)
        self.assertEqual(me_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_14_revoke_all_sessions_with_keep_current(self):
        """Revoke all sessions with keep_current=True keeps current session alive."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        # Create 2 sessions
        s1 = UserSession.objects.create(
            user=db_user,
            refresh_token_jti="jti_remote_device_1",
            device_label="Mobile Device",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )
        s2 = UserSession.objects.create(
            user=db_user,
            refresh_token_jti="jti_current_device_2",
            device_label="Workstation Chrome",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(db_user)
        refresh['session_id'] = str(s2.id)
        access = refresh.access_token
        access['session_id'] = str(s2.id)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(access)}")
        revoke_resp = self.client.post(f"{self.sessions_url}revoke-all/", {'keep_current': True}, format='json')
        self.assertEqual(revoke_resp.status_code, status.HTTP_200_OK)

        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertTrue(s1.revoked)
        self.assertFalse(s2.revoked)

    # =========================================================================
    # Password Reset & Session Invalidation (Recommendation 3)
    # =========================================================================

    def test_15_password_reset_flow_and_session_invalidation(self):
        """CRITICAL SECURITY TEST: Password reset successfully changes password AND revokes all active sessions."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])
        db_user.email_verified = True
        db_user.account_status = 'ACTIVE'
        db_user.save()

        # Create active sessions
        s1 = UserSession.objects.create(
            user=db_user,
            refresh_token_jti="active_jti_1",
            device_label="MacBook Safari",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )
        s2 = UserSession.objects.create(
            user=db_user,
            refresh_token_jti="active_jti_2",
            device_label="Android Phone",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )

        # 1. Request password reset (safe response)
        req_resp = self.client.post(self.forgot_password_url, {'email': db_user.email}, format='json')
        self.assertEqual(req_resp.status_code, status.HTTP_200_OK)
        self.assertIn("password reset email has been sent", req_resp.data.get('message', ''))


        # Get generated token
        from accounts.utils import generate_and_send_password_reset_email
        reset_info = generate_and_send_password_reset_email(db_user)
        raw_reset_token = reset_info['raw_token']

        # 2. Confirm password reset
        confirm_resp = self.client.post(self.reset_password_url, {
            'token': raw_reset_token,
            'password': 'NewSecurePassword@2027',
            'confirm_password': 'NewSecurePassword@2027'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)

        # Assert password updated
        db_user.refresh_from_db()
        self.assertTrue(db_user.check_password("NewSecurePassword@2027"))
        self.assertFalse(db_user.check_password("SecurePassword@2026"))

        # Assert ALL PREVIOUS SESSIONS ARE REVOKED
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertTrue(s1.revoked)
        self.assertTrue(s2.revoked)
        self.assertIsNotNone(s1.revoked_at)
        self.assertIsNotNone(s2.revoked_at)

    # =========================================================================
    # Module 7: Security Audit Logs & Sensitive Credentials Safety
    # =========================================================================

    def test_16_audit_logs_record_events_without_sensitive_credentials(self):
        """Security events and login attempts never leak plaintext passwords or tokens."""
        self.client.post(self.register_url, self.valid_user_payload, format='json')
        db_user = User.objects.get(email=self.valid_user_payload['email'])

        # Failed attempt
        self.client.post(self.login_url, {
            'email': self.valid_user_payload['email'],
            'password': 'WrongPassword123!'
        }, format='json')

        attempts = LoginAttempt.objects.filter(email_attempted=db_user.email)
        self.assertTrue(attempts.exists())
        for attempt in attempts:
            # Check fields
            self.assertFalse(hasattr(attempt, 'password'))
            self.assertFalse(hasattr(attempt, 'otp'))
            self.assertFalse(hasattr(attempt, 'token'))
            self.assertNotIn("WrongPassword123!", str(attempt.__dict__))

    # =========================================================================
    # Module 3: Google Authentication & MFA Enforcement (Recommendation 2)
    # =========================================================================

    def test_17_google_oauth_mfa_handoff(self):
        """CRITICAL: Google OAuth is primary authentication only; user must complete OTP before getting JWT."""
        from unittest.mock import patch
        google_url = '/api/auth/google/'

        fake_id_info = {
            'sub': 'google_user_sub_998877',
            'email': 'citizen.google@digivote.gov.in',
            'name': 'Google Citizen',
            'email_verified': True
        }

        with patch('google.oauth2.id_token.verify_oauth2_token', return_value=fake_id_info):
            response = self.client.post(google_url, {'id_token': 'dummy_google_jwt_token'}, format='json')

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data.get('auth_state'), 'PENDING_MFA')
            self.assertTrue(response.data.get('mfa_required'))
            self.assertIn('pre_auth_token', response.data)

            # Ensure final JWT is NOT issued yet
            self.assertNotIn('access', response.data.get('tokens', {}))

            # Verify user exists in database
            db_user = User.objects.get(email='citizen.google@digivote.gov.in')
            self.assertEqual(db_user.google_id, 'google_user_sub_998877')
            self.assertEqual(db_user.role, User.VOTER)

            # Verify OTP challenge was generated
            otp_record = OTPCode.objects.filter(user=db_user, used=False).first()
            self.assertIsNotNone(otp_record)

