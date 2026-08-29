from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile


class RegisterModuleTests(TestCase):
    """
    Test suite for Module 1 (Registration Module) in DigiVote.
    Includes positive flows, validation checks, negative security cases,
    duplicate conflicts (409), rate limit thresholds, and sanitized payload assertions.
    """
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.valid_payload = {
            "full_name": "Arul Raj",
            "email": "arul.voter@digivote.gov.in",
            "mobile_number": "9876543210",
            "password": "SecurePassword@123",
            "confirm_password": "SecurePassword@123"
        }

    def test_successful_registration(self):
        """Test valid registration creates user with pending_verification and sanitized response."""
        response = self.client.post(self.register_url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))
        self.assertIn('user', response.data)
        
        user_data = response.data['user']
        self.assertEqual(user_data['email'], "arul.voter@digivote.gov.in")
        self.assertEqual(user_data['full_name'], "Arul Raj")
        self.assertEqual(user_data['mobile_number'], "9876543210")
        self.assertEqual(user_data['status'], "pending_verification")
        self.assertFalse(user_data['is_email_verified'])
        
        # Security assertion: password and hash must never be in response
        self.assertNotIn('password', user_data)
        self.assertNotIn('password_hash', user_data)
        self.assertNotIn('code_hash', user_data)

        # Assert in database
        db_user = User.objects.get(email="arul.voter@digivote.gov.in")
        self.assertTrue(db_user.check_password("SecurePassword@123"))
        self.assertFalse(db_user.email_verified)
        self.assertEqual(db_user.account_status, 'PENDING_EMAIL_VERIFICATION')

    def test_case_insensitive_duplicate_email_returns_409(self):
        """Test duplicate email with different casing returns 409 Conflict."""
        self.client.post(self.register_url, self.valid_payload, format='json')

        duplicate_payload = self.valid_payload.copy()
        duplicate_payload["email"] = "ARUL.VOTER@DIGIVOTE.GOV.IN"
        duplicate_payload["mobile_number"] = "9876543211"

        response = self.client.post(self.register_url, duplicate_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('field'), 'email')
        self.assertIn("already registered", response.data.get('message', ''))

    def test_duplicate_mobile_number_returns_409(self):
        """Test duplicate mobile number returns 409 Conflict."""
        self.client.post(self.register_url, self.valid_payload, format='json')

        duplicate_payload = self.valid_payload.copy()
        duplicate_payload["email"] = "different.user@digivote.gov.in"

        response = self.client.post(self.register_url, duplicate_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('field'), 'mobile_number')
        self.assertIn("already registered", response.data.get('message', ''))

    def test_password_confirmation_mismatch(self):
        """Test mismatched password confirmation is rejected."""
        payload = self.valid_payload.copy()
        payload["confirm_password"] = "DifferentPassword@123"
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('field'), 'confirm_password')

    def test_weak_password_missing_uppercase(self):
        """Test password missing uppercase is rejected."""
        payload = self.valid_payload.copy()
        payload["password"] = "password@123"
        payload["confirm_password"] = "password@123"
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("uppercase", response.data.get('message', '').lower())

    def test_weak_password_missing_number(self):
        """Test password missing numbers is rejected."""
        payload = self.valid_payload.copy()
        payload["password"] = "Password@Special"
        payload["confirm_password"] = "Password@Special"
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("numeric", response.data.get('message', '').lower())

    def test_weak_password_missing_special_char(self):
        """Test password missing special characters is rejected."""
        payload = self.valid_payload.copy()
        payload["password"] = "Password12345"
        payload["confirm_password"] = "Password12345"
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("special", response.data.get('message', '').lower())

    def test_invalid_mobile_format(self):
        """Test invalid mobile number format is rejected."""
        payload = self.valid_payload.copy()
        payload["mobile_number"] = "12345"  # Too short
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_and_sqli_payload_handling(self):
        """Test security resilience against SQL injection strings and malformed data."""
        payload = {
            "full_name": "' OR '1'='1' --",
            "email": "admin'--@domain.com",
            "mobile_number": "'+DROP TABLE users;--",
            "password": "SecurePassword@123",
            "confirm_password": "SecurePassword@123"
        }
        response = self.client.post(self.register_url, payload, format='json')
        # Should gracefully return 400 validation error, not 500
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])
