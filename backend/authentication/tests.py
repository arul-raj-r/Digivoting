from django.test import TransactionTestCase
from django.urls import reverse
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.test import APIClient
from datetime import date
from authentication.models import User, OTPVerification
from voters.models import Constituency, Voter, VoterIDCard

class VoterIDCardAuthTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        # 1. Create Constituency
        self.constituency = Constituency.objects.create(name="Chennai Central", description="Central Chennai Area")
        
        # 2. Register a Voter (we will do this directly to seed a verified voter)
        self.voter_user = User.objects.create_user(
            username="voter_auth_test",
            password="testpassword123",
            email="voter_test@test.com",
            first_name="Raj",
            last_name="Kumar",
            role=User.VOTER
        )
        self.voter = Voter.objects.create(
            user=self.voter_user,
            voter_id_number="VT000099",
            constituency=self.constituency,
            face_photo_url="https://supabase.co/photo.jpg",
            date_of_birth=date(1995, 8, 15),
            gender="Male",
            is_verified=False
        )

        # 3. Create an Admin user
        self.admin_user = User.objects.create_user(
            username="admin_auth_test",
            password="adminpassword123",
            email="admin_test@test.com",
            role=User.ADMIN
        )

    def test_card_generation_on_approval(self):
        """
        Verify that verifying a voter automatically generates a VoterIDCard.
        """
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('voter_verify', args=[self.voter.id])
        
        # Verify card does not exist yet
        self.assertFalse(VoterIDCard.objects.filter(voter=self.voter).exists())
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify card is generated
        self.assertTrue(VoterIDCard.objects.filter(voter=self.voter).exists())
        card = VoterIDCard.objects.get(voter=self.voter)
        self.assertIsNotNone(card.card_number)
        self.assertEqual(card.full_name, "Raj Kumar")
        self.assertEqual(card.gender, "Male")
        self.assertEqual(card.status, "ACTIVE")

    def test_login_verification_flow_voter(self):
        """
        Verify the three-step login sequence for verified voters.
        """
        # Step 1: Approve voter to generate their card
        self.client.force_authenticate(user=self.admin_user)
        self.client.post(reverse('voter_verify', args=[self.voter.id]))
        self.client.logout()
        
        card = VoterIDCard.objects.get(voter=self.voter)

        # Step 2: Post credentials to /auth/login/
        login_url = reverse('auth_login')
        response = self.client.post(login_url, {
            'username': 'voter_auth_test',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'OTP_REQUIRED')
        
        # Retrieve generated OTP
        otp_record = OTPVerification.objects.filter(user=self.voter_user).latest('created_at')
        otp_record.otp_code_hash = make_password('123456')
        otp_record.save()
        
        # Step 3: Post OTP to /auth/verify/
        verify_url = reverse('auth_verify')
        response = self.client.post(verify_url, {
            'username': 'voter_auth_test',
            'otp_code': '123456'
        })
        # Check that it returns status CARD_VERIFICATION_REQUIRED and does NOT issue tokens yet
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'CARD_VERIFICATION_REQUIRED')
        self.assertEqual(response.data['photo_preview_url'], 'https://supabase.co/photo.jpg')
        self.assertNotIn('access', response.data)
        
        # Step 4: Post WRONG card number to /auth/verify-card/
        verify_card_url = reverse('auth_verify_card')
        response = self.client.post(verify_card_url, {
            'username': 'voter_auth_test',
            'card_number': 'WRONGNUMBER'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('2 attempt(s) remaining', response.data['error'])
        
        # Step 5: Post CORRECT card number to /auth/verify-card/
        response = self.client.post(verify_card_url, {
            'username': 'voter_auth_test',
            'card_number': card.card_number
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'voter_auth_test')

    def test_login_verification_flow_admin_bypasses(self):
        """
        Verify that admin bypasses the card verification step.
        """
        login_url = reverse('auth_login')
        response = self.client.post(login_url, {
            'username': 'admin_auth_test',
            'password': 'adminpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'OTP_REQUIRED')
        
        otp_record = OTPVerification.objects.filter(user=self.admin_user).latest('created_at')
        otp_record.otp_code_hash = make_password('123456')
        otp_record.save()
        
        verify_url = reverse('auth_verify')
        response = self.client.post(verify_url, {
            'username': 'admin_auth_test',
            'otp_code': '123456'
        })
        # Check that it returns tokens directly
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertNotIn('status', response.data)  # Bypassed CARD_VERIFICATION_REQUIRED
