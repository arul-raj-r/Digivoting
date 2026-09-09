import jwt
from datetime import timedelta
from django.test import TestCase
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import User, UserProfile, UserSession


class Module6SessionManagementTests(TestCase):
    """
    Test suite for Module 6: Session Management & Multi-Device Revocation.
    """
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.sessions_url = '/api/auth/sessions/'
        self.revoke_all_url = '/api/auth/sessions/revoke-all/'
        self.logout_url = '/api/auth/logout/'

        # Setup citizen user 1
        self.user = User.objects.create_user(
            username="session_voter",
            email="voter.sessions@digivote.gov.in",
            password="SecurePassword@123",
            email_verified=True,
            account_status='ACTIVE'
        )

        # Setup citizen user 2 (for cross-user permission checks)
        self.other_user = User.objects.create_user(
            username="other_voter",
            email="other.voter@digivote.gov.in",
            password="SecurePassword@123",
            email_verified=True,
            account_status='ACTIVE'
        )

        # Create session 1 for user (Chrome on Windows)
        refresh1 = RefreshToken.for_user(self.user)
        self.session1 = UserSession.objects.create(
            user=self.user,
            refresh_token_jti=refresh1['jti'],
            device_label="Google Chrome on Windows",
            ip_address="192.168.1.50",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )
        refresh1['session_id'] = str(self.session1.id)
        access1 = refresh1.access_token
        access1['session_id'] = str(self.session1.id)
        self.token1 = str(access1)
        self.refresh1 = str(refresh1)

        # Create session 2 for user (Safari on iOS)
        refresh2 = RefreshToken.for_user(self.user)
        self.session2 = UserSession.objects.create(
            user=self.user,
            refresh_token_jti=refresh2['jti'],
            device_label="Apple Safari on iOS",
            ip_address="10.0.0.88",
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
            expires_at=timezone.now() + timedelta(days=7),
            revoked=False
        )
        refresh2['session_id'] = str(self.session2.id)
        access2 = refresh2.access_token
        access2['session_id'] = str(self.session2.id)
        self.token2 = str(access2)
        self.refresh2 = str(refresh2)

    def test_list_sessions_identifies_current_session(self):
        """GET /api/auth/sessions/ returns active sessions and correctly flags is_current=True for requesting session."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data.get('count'), 2)

        sessions = response.data.get('sessions')
        session1_data = next(s for s in sessions if s['id'] == str(self.session1.id))
        session2_data = next(s for s in sessions if s['id'] == str(self.session2.id))

        self.assertTrue(session1_data['is_current'])
        self.assertFalse(session2_data['is_current'])
        self.assertEqual(session1_data['masked_ip'], '192.168.*.*')

    def test_revoking_session_invalidates_jwt_immediately(self):
        """Device A revokes Device B's session; Device B's next API request is immediately rejected with 401."""
        # Device A revokes Device B (session 2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        revoke_res = self.client.delete(f'/api/auth/sessions/{self.session2.id}/')
        self.assertEqual(revoke_res.status_code, status.HTTP_200_OK)

        self.session2.refresh_from_db()
        self.assertTrue(self.session2.revoked)

        # Device B attempts to access API with token2
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token2}')
        b_res = self.client.get(self.sessions_url)
        self.assertEqual(b_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(b_res.data.get('code'), 'SESSION_REVOKED')

    def test_cross_user_session_revocation_forbidden(self):
        """User cannot revoke another user's session (returns 403 Forbidden)."""
        # Create session for other user
        refresh_other = RefreshToken.for_user(self.other_user)
        other_session = UserSession.objects.create(
            user=self.other_user,
            refresh_token_jti=refresh_other['jti'],
            device_label="Firefox on Linux",
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Authenticate as user 1 and attempt to delete other_user's session
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        response = self.client.delete(f'/api/auth/sessions/{other_session.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_revoke_all_sessions_keeps_current_when_requested(self):
        """POST /api/auth/sessions/revoke-all/ with keep_current=True revokes all except current session."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        response = self.client.post(self.revoke_all_url, {'keep_current': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('revoked_count'), 1)

        self.session1.refresh_from_db()
        self.session2.refresh_from_db()

        self.assertFalse(self.session1.revoked) # Preserved
        self.assertTrue(self.session2.revoked)  # Revoked

    def test_logout_revokes_current_session_and_blacklists_refresh(self):
        """POST /api/auth/logout/ revokes session and blacklists refresh token."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        response = self.client.post(self.logout_url, {'refresh': self.refresh1}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.session1.refresh_from_db()
        self.assertTrue(self.session1.revoked)

        # Confirm token1 is rejected on next request
        after_res = self.client.get(self.sessions_url)
        self.assertEqual(after_res.status_code, status.HTTP_401_UNAUTHORIZED)
