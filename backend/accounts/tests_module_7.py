from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import User, LoginAttempt, SecurityEvent


class Module7SecurityTests(TestCase):
    """
    Test suite for Module 7: Security Module, Lockout, and Audit Logging.
    """
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.login_url = '/api/auth/login/'
        self.security_events_url = '/api/auth/admin/security-events/'
        self.password = "SecurePassword@123"

        # Standard voter user
        self.user = User.objects.create_user(
            username="citizen_sec",
            email="citizen.security@digivote.gov.in",
            password=self.password,
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )

        # Admin user
        self.admin_user = User.objects.create_user(
            username="admin_sec",
            email="admin.security@digivote.gov.in",
            password=self.password,
            role=User.ADMIN,
            is_staff=True,
            email_verified=True,
            account_status='ACTIVE'
        )
        refresh = RefreshToken.for_user(self.admin_user)
        self.admin_token = str(refresh.access_token)

    def test_five_failed_logins_in_rolling_window_locks_account(self):
        """5 failed login attempts in rolling 15 minutes locks account; 6th attempt is rejected with ACCOUNT_LOCKED."""
        for i in range(5):
            res = self.client.post(self.login_url, {
                'email': self.user.email,
                'password': 'WrongPassword123'
            }, format='json')

            if i < 4:
                self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
            else:
                # 5th failure triggers lockout
                self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(res.data.get('code'), 'ACCOUNT_LOCKED')

        self.user.refresh_from_db()
        self.assertEqual(self.user.account_status, 'LOCKED')
        self.assertIsNotNone(self.user.locked_until)

        # Clear rate-limiting cache so 6th request tests lockout policy rather than endpoint IP throttling
        cache.clear()

        # 6th attempt even with CORRECT password is rejected
        attempt6 = self.client.post(self.login_url, {
            'email': self.user.email,
            'password': self.password
        }, format='json')
        self.assertEqual(attempt6.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(attempt6.data.get('code'), 'ACCOUNT_LOCKED')

        # Check SecurityEvent created for lockout
        sec_event = SecurityEvent.objects.filter(user=self.user, event_type='account_locked').first()
        self.assertIsNotNone(sec_event)

    def test_auto_unlock_when_locked_until_expires(self):
        """Account auto-unlocks and allows login once locked_until time passes."""
        # Manually lock account with past expiration
        self.user.account_status = 'LOCKED'
        self.user.locked_at = timezone.now() - timedelta(minutes=35)
        self.user.locked_until = timezone.now() - timedelta(minutes=5)
        self.user.failed_login_count = 5
        self.user.save()

        # Login with correct credentials
        response = self.client.post(self.login_url, {
            'email': self.user.email,
            'password': self.password
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('auth_state'), 'PENDING_MFA')

        self.user.refresh_from_db()
        self.assertEqual(self.user.account_status, 'ACTIVE')
        self.assertEqual(self.user.failed_login_count, 0)

        # Confirm auto-unlock event logged
        auto_event = SecurityEvent.objects.filter(user=self.user, event_type='account_auto_unlocked').first()
        self.assertIsNotNone(auto_event)

    def test_manual_admin_unlock_restores_active_status(self):
        """Admin can manually unlock a locked user via POST /api/auth/admin/users/<id>/unlock/."""
        self.user.account_status = 'LOCKED'
        self.user.locked_at = timezone.now()
        self.user.locked_until = timezone.now() + timedelta(minutes=30)
        self.user.failed_login_count = 5
        self.user.save()

        # Regular non-admin token is rejected with 403
        refresh_voter = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh_voter.access_token)}')
        voter_res = self.client.post(f'/api/auth/admin/users/{self.user.id}/unlock/')
        self.assertEqual(voter_res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin token succeeds
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        admin_res = self.client.post(f'/api/auth/admin/users/{self.user.id}/unlock/')
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.account_status, 'ACTIVE')
        self.assertEqual(self.user.failed_login_count, 0)

        # Check manual unlock event logged
        manual_event = SecurityEvent.objects.filter(user=self.user, event_type='manual_unlock').first()
        self.assertIsNotNone(manual_event)

    def test_admin_security_events_endpoint_permissions_and_stats(self):
        """Only admins can view security events; returns aggregate stats and event logs."""
        SecurityEvent.objects.create(
            user=self.user,
            event_type='account_locked',
            ip_address='192.168.1.1',
            metadata={'test': True}
        )

        # Non-admin forbidden
        refresh_voter = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh_voter.access_token)}')
        forbidden_res = self.client.get(self.security_events_url)
        self.assertEqual(forbidden_res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin authorized
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        admin_res = self.client.get(self.security_events_url)
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)
        self.assertTrue(admin_res.data.get('success'))
        self.assertIn('stats', admin_res.data)
        self.assertIn('events', admin_res.data)
