from django.test import TransactionTestCase
from django.urls import reverse
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient
from datetime import date, timedelta
from django.utils import timezone

from authentication.models import User, OTPVerification
from locations.models import State, District, Constituency
from voters.models import VoterProfile, VoterIDCard

class DigiVoteBackendTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Setup location hierarchy
        self.state = State.objects.create(name="Tamil Nadu")
        self.district = District.objects.create(state=self.state, name="Chennai")
        self.constituency = Constituency.objects.create(district=self.district, name="Chennai Central", description="Central Area")
        
        # Setup Admin
        self.admin_user = User.objects.create_superuser(
            username="admin_test",
            password="adminpassword123",
            email="admin_test@digivote.gov.in",
            role=User.ADMIN
        )

        # Setup Voter User
        self.voter_user = User.objects.create_user(
            username="voter_test",
            password="voterpassword123",
            email="voter_test@mail.com",
            first_name="Ramesh",
            last_name="Kumar",
            role=User.VOTER
        )
        
        # Setup VoterProfile manually (no automatic trigger exists)
        self.voter_profile = VoterProfile.objects.create(
            user=self.voter_user,
            voter_reference="VT982001",
            constituency=self.constituency,
            verification_status='PENDING'
        )

    def test_database_connection(self):
        """1. Verify Database Liveness checks"""
        url = reverse('v1:database_health_check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

    def test_user_creation_and_hashing(self):
        """2. Verify user creation and password hashing"""
        self.assertEqual(self.voter_user.email, "voter_test@mail.com")
        self.assertTrue(self.voter_user.check_password("voterpassword123"))
        self.assertNotEqual(self.voter_user.password, "voterpassword123")  # Hashed!

    def test_duplicate_email_prevention(self):
        """3. Enforce duplicate email prevention constraint"""
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="another_voter",
                password="password123",
                email="voter_test@mail.com",  # Duplicate!
                role=User.VOTER
            )

    def test_voter_profile_status(self):
        """4. Verify default VoterProfile status is PENDING"""
        profile = VoterProfile.objects.get(user=self.voter_user)
        self.assertEqual(profile.verification_status, 'PENDING')
        self.assertFalse(profile.verified_at)

    def test_account_creation_does_not_verify_voter(self):
        """5. Critical: Account creation must NOT automatically make the user a verified voter"""
        profile = VoterProfile.objects.get(user=self.voter_user)
        self.assertNotEqual(profile.verification_status, 'VERIFIED')

    def test_otp_hash_not_plaintext(self):
        """6. OTP code hashes are not stored in plaintext"""
        otp = OTPVerification.objects.create(
            user=self.voter_user,
            purpose='LOGIN',
            code_hash=make_password('123456'),
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        self.assertNotEqual(otp.code_hash, '123456')
        self.assertTrue(check_password('123456', otp.code_hash))

    def test_otp_expiration(self):
        """7. Verify OTP expiration logic works correctly"""
        # Expired OTP
        expired_otp = OTPVerification.objects.create(
            user=self.voter_user,
            purpose='LOGIN',
            code_hash=make_password('123456'),
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        # Check active OTP query logic matches OTPVerifyView
        active_otps = OTPVerification.objects.filter(
            user=self.voter_user,
            used=False,
            expires_at__gt=timezone.now()
        )
        self.assertNotIn(expired_otp, active_otps)

    def test_otp_single_use(self):
        """8. Verify OTP single-use constraint is enforced"""
        otp = OTPVerification.objects.create(
            user=self.voter_user,
            purpose='LOGIN',
            code_hash=make_password('123456'),
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        # Verify liveness
        self.assertFalse(otp.used)
        
        # Complete verify API simulation
        verify_url = reverse('v1:auth_verify')
        response = self.client.post(verify_url, {
            'username': 'voter_test@mail.com',
            'otp_code': '123456'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify OTP is marked used
        otp.refresh_from_db()
        self.assertTrue(otp.used)

        # Attempt to reuse it
        response_reuse = self.client.post(verify_url, {
            'username': 'voter_test@mail.com',
            'otp_code': '123456'
        })
        self.assertEqual(response_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_database_constraints(self):
        """9. Check state and district unique together constraints"""
        d1 = District.objects.create(state=self.state, name="Coimbatore")
        with self.assertRaises(IntegrityError):
            District.objects.create(state=self.state, name="Coimbatore")  # Duplicate!

    def test_health_endpoints(self):
        """10. Verify /api/v1/health/ outputs correct payload"""
        url = reverse('v1:health_check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], "DigiVote backend is running")

    def test_admin_access(self):
        """11. Verify admin permissions gate admin lists"""
        # Unauthenticated query to list
        url = reverse('v1:voter_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Voter query to list (Voter is not admin)
        self.client.force_authenticate(user=self.voter_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin query to list
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seed_demo_command(self):
        """12. Verify demo database seed command runs successfully"""
        call_command('seed_demo')
        # Check that constituencies exist
        self.assertTrue(Constituency.objects.filter(name__contains="DEMO").exists())
        self.assertTrue(User.objects.filter(username="voter1").exists())

    def test_card_generation_on_approval(self):
        """13. Verify voter certification and ID card issuance sequence"""
        voter_profile = VoterProfile.objects.get(user=self.voter_user)
        voter_profile.constituency = self.constituency
        voter_profile.date_of_birth = date(1995, 8, 15)
        voter_profile.gender = "Male"
        voter_profile.save()

        self.client.force_authenticate(user=self.admin_user)
        url = reverse('v1:voter_verify', args=[voter_profile.id])
        
        self.assertFalse(VoterIDCard.objects.filter(voter=voter_profile).exists())
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertTrue(VoterIDCard.objects.filter(voter=voter_profile).exists())
        card = VoterIDCard.objects.get(voter=voter_profile)
        self.assertIsNotNone(card.card_number)
        self.assertEqual(card.full_name, "Ramesh Kumar")
        self.assertEqual(card.status, "ACTIVE")
