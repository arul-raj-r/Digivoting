import os
import secrets
import hashlib
from datetime import timedelta
from unittest.mock import patch, MagicMock
import numpy as np

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from elections.models import (
    Election, EligibleVoter, Candidate, ElectionRules,
    ElectionVerificationConfig, ElectionAuditLog
)
from authentication.models import OTPVerification
from voting.models import (
    Ballot, ElectionEncryptionKey, ElectionResult,
    CandidateResult, VotingAuthorization
)
from voting.tally import compute_election_tally

User = get_user_model()


class FullPostAuthModulesIntegrationTests(TestCase):
    """
    Automated verification suite for the 4 DigiVote post-authentication modules:
    1. Election Creation & Lifecycle (active -> paused -> resumed -> completed, config locks)
    2. Voter Verification Flow (Email OTP, Face verification, Authorization token issuance)
    3. Voting Module (Single-use token consumption, 100% ballot secrecy, duplicate vote block)
    4. Results & Reports Module (Cryptographic tally, tie detection, unpublish, export)
    """

    def setUp(self):
        os.environ['VOTING_MASTER_KEY'] = 'ZTMxYjA1NDk4NWExNGE3NjE2Y2RlYzg3MWQ2YjA0MzE1MzgyZDhhZjQ1N2IyMDI0M2IxZTc4Njc2NmVlMzhlZQ=='

        self.creator = User.objects.create_user(
            username='organizer',
            email='organizer@digivote.app',
            password='Password123!',
            role='ELECTION_CREATOR'
        )
        self.voter1 = User.objects.create_user(
            username='voter1',
            email='voter1@digivote.app',
            password='Password123!',
            role='VOTER'
        )
        self.voter2 = User.objects.create_user(
            username='voter2',
            email='voter2@digivote.app',
            password='Password123!',
            role='VOTER'
        )
        self.unregistered_user = User.objects.create_user(
            username='unregistered',
            email='stranger@digivote.app',
            password='Password123!',
            role='VOTER'
        )

        self.client = APIClient()

        # Create active test election
        self.election = Election.objects.create(
            title='Executive Board Election 2026',
            description='Annual executive board election',
            election_type='general',
            status='active',
            created_by=self.creator,
            start_datetime=timezone.now() - timedelta(hours=1),
            end_datetime=timezone.now() + timedelta(hours=5),
        )

        # Candidates
        self.cand_a = Candidate.objects.create(
            election=self.election,
            full_name='Alice Smith',
            party_or_affiliation='Progressive Union'
        )
        self.cand_b = Candidate.objects.create(
            election=self.election,
            full_name='Bob Jones',
            party_or_affiliation='Alliance Forward'
        )

        # Voter rolls
        self.ev1 = EligibleVoter.objects.create(
            election=self.election,
            email=self.voter1.email,
            user=self.voter1
        )
        self.ev2 = EligibleVoter.objects.create(
            election=self.election,
            email=self.voter2.email,
            user=self.voter2
        )

    # =========================================================================
    # MODULE 1: ELECTION LIFECYCLE & CONFIG LOCK
    # =========================================================================

    def test_election_pause_resume_complete_lifecycle(self):
        """Election state machine: active -> paused -> active -> completed."""
        self.client.force_authenticate(user=self.creator)

        # 1. Pause election
        res = self.client.post(f'/api/elections/{self.election.id}/pause/', {
            'reason': 'Temporary network audit maintenance'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'paused')

        # While paused, voting eligibility should block (returns 400 with error message)
        self.client.force_authenticate(user=self.voter1)
        ballot_res = self.client.get(f'/api/voter/elections/{self.election.id}/eligibility/')
        self.assertEqual(ballot_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ballot_res.data['eligible'])
        self.assertIn('paused', ballot_res.data['error'].lower())

        # 2. Resume election
        self.client.force_authenticate(user=self.creator)
        res = self.client.post(f'/api/elections/{self.election.id}/resume/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'active')

        # 3. Complete election (triggers tally calculation)
        res = self.client.post(f'/api/elections/{self.election.id}/complete/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'completed')

    def test_configuration_lock_on_active_and_paused_election(self):
        """Active and paused elections cannot have configuration or candidates modified."""
        self.assertFalse(self.election.is_editable())

        # Pause and check is_editable
        self.election.status = 'paused'
        self.election.save()
        self.assertFalse(self.election.is_editable())

        # Completed and check is_editable
        self.election.status = 'completed'
        self.election.save()
        self.assertFalse(self.election.is_editable())

    # =========================================================================
    # MODULE 2: VOTER VERIFICATION (OTP, FACE RECOGNITION, AUTHORIZATION)
    # =========================================================================

    def test_voter_eligibility_check_enforcement(self):
        """Voter eligibility check correctly verifies roll membership and requirements."""
        # Registered voter
        self.client.force_authenticate(user=self.voter1)
        res = self.client.get(f'/api/voter/elections/{self.election.id}/eligibility/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['eligible'])

        # Unregistered voter
        self.client.force_authenticate(user=self.unregistered_user)
        res = self.client.get(f'/api/voter/elections/{self.election.id}/eligibility/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(res.data['eligible'])

    @patch('authentication.services.email_service.EmailService.send_otp_email')
    def test_email_otp_request_and_verification_reusing_auth_model(self, mock_send_email):
        """OTP flow reuses authentication.models.OTPVerification without duplication."""
        mock_send_email.return_value = True
        self.client.force_authenticate(user=self.voter1)

        # 1. Request OTP
        req_res = self.client.post(f'/api/voter/elections/{self.election.id}/otp/', {
            'action': 'request'
        })
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        challenge_id = req_res.data['challenge_id']

        # Verify record in authentication.models.OTPVerification
        otp_record = OTPVerification.objects.filter(
            user=self.voter1,
            purpose='ELECTION_VERIFICATION',
            used=False
        ).latest('created_at')
        self.assertIsNotNone(otp_record)

        # 2. Verify invalid OTP
        bad_res = self.client.post(f'/api/voter/elections/{self.election.id}/otp/', {
            'action': 'verify',
            'challenge_id': str(otp_record.id),
            'otp_code': '000000'
        })
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Verify valid OTP (123456 in dev/demo mode)
        good_res = self.client.post(f'/api/voter/elections/{self.election.id}/otp/', {
            'action': 'verify',
            'challenge_id': str(otp_record.id),
            'otp_code': '123456'
        })
        self.assertEqual(good_res.status_code, status.HTTP_200_OK)
        self.assertTrue(good_res.data['verified'])

        # Check voter status updated (fully VERIFIED since webcam is not required)
        self.ev1.refresh_from_db()
        self.assertEqual(self.ev1.verification_status, 'VERIFIED')

    @patch('voting.verification_views.verify_voter_face')
    def test_webcam_face_verification_view(self, mock_face_service):
        """Webcam face verification updates voter verification status."""
        mock_face_service.return_value = {
            'verified': True,
            'confidence': 0.88,
            'message': 'Face verification successful.',
            'enrollment_updated': False
        }

        self.client.force_authenticate(user=self.voter1)
        res = self.client.post(f'/api/voter/elections/{self.election.id}/face-verification/', {
            'image': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['verified'])

        self.ev1.refresh_from_db()
        self.assertEqual(self.ev1.verification_status, 'FACE_VERIFIED')

    def test_voting_authorization_issuance_and_expiry(self):
        """Single-use authorization token is issued when requirements are met."""
        self.ev1.verification_status = 'VERIFIED'
        self.ev1.save()

        self.client.force_authenticate(user=self.voter1)
        res = self.client.post(f'/api/voter/elections/{self.election.id}/authorization/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('authorization_token', res.data)
        token = res.data['authorization_token']

        # Verify VotingAuthorization record exists
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        auth_record = VotingAuthorization.objects.filter(
            election=self.election,
            voter=self.ev1,
            token_hash=token_hash,
            consumed=False
        ).first()
        self.assertIsNotNone(auth_record)
        self.assertFalse(auth_record.consumed)

    # =========================================================================
    # MODULE 3: VOTING & BALLOT CONFIDENTIALITY
    # =========================================================================

    def test_anonymous_ballot_submission_and_duplicate_prevention(self):
        """Submitting ballot consumes authorization, sets has_voted, and stores anonymous ballot."""
        self.ev1.verification_status = 'VERIFIED'
        self.ev1.save()

        # 1. Obtain authorization token
        self.client.force_authenticate(user=self.voter1)
        auth_res = self.client.post(f'/api/voter/elections/{self.election.id}/authorization/')
        auth_token = auth_res.data['authorization_token']

        # 2. Submit vote for Candidate A
        submit_res = self.client.post(f'/api/elections/{self.election.id}/ballot/submit/', {
            'candidate_id': str(self.cand_a.id),
            'authorization_token': auth_token
        })
        self.assertEqual(submit_res.status_code, status.HTTP_201_CREATED)
        self.assertIn('receipt_id', submit_res.data)
        # Ballot response must never reveal voter identity or selected candidate
        self.assertNotIn(self.cand_a.full_name, str(submit_res.data))
        self.assertNotIn(self.voter1.email, str(submit_res.data))

        # 3. Check voter state updated
        self.ev1.refresh_from_db()
        self.assertTrue(self.ev1.has_voted)
        self.assertIsNotNone(self.ev1.voted_at)

        # 4. Check Ballot record has NO voter FK
        ballots = Ballot.objects.filter(election=self.election)
        self.assertEqual(ballots.count(), 1)
        ballot = ballots.first()
        self.assertFalse(hasattr(ballot, 'voter'))
        self.assertFalse(hasattr(ballot, 'user'))

        # 5. Check authorization token is consumed
        token_hash = hashlib.sha256(auth_token.encode('utf-8')).hexdigest()
        auth_record = VotingAuthorization.objects.get(token_hash=token_hash)
        self.assertTrue(auth_record.consumed)

        # 6. Attempt DUPLICATE vote submission with same token -> 400 Bad Request (token consumed)
        dup_res = self.client.post(f'/api/elections/{self.election.id}/ballot/submit/', {
            'candidate_id': str(self.cand_b.id),
            'authorization_token': auth_token
        })
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # MODULE 4: RESULTS COMPUTATION, TIES, PUBLICATION & EXPORT
    # =========================================================================

    def test_results_tally_and_tie_detection(self):
        """Results correctly determine winner or tie."""
        # Cast 1 vote for Candidate A and 1 vote for Candidate B
        self.ev1.verification_status = 'VERIFIED'
        self.ev1.save()
        self.ev2.verification_status = 'VERIFIED'
        self.ev2.save()

        # Voter 1 votes Candidate A
        self.client.force_authenticate(user=self.voter1)
        t1 = self.client.post(f'/api/voter/elections/{self.election.id}/authorization/').data['authorization_token']
        self.client.post(f'/api/elections/{self.election.id}/ballot/submit/', {
            'candidate_id': str(self.cand_a.id),
            'authorization_token': t1
        })

        # Voter 2 votes Candidate B (resulting in 1-1 tie)
        self.client.force_authenticate(user=self.voter2)
        t2 = self.client.post(f'/api/voter/elections/{self.election.id}/authorization/').data['authorization_token']
        self.client.post(f'/api/elections/{self.election.id}/ballot/submit/', {
            'candidate_id': str(self.cand_b.id),
            'authorization_token': t2
        })

        # Generate results
        self.client.force_authenticate(user=self.creator)
        gen_res = self.client.post(f'/api/results/{self.election.id}/generate/')
        self.assertEqual(gen_res.status_code, status.HTTP_200_OK)

        # Retrieve results
        results_res = self.client.get(f'/api/elections/{self.election.id}/results/')
        self.assertEqual(results_res.status_code, status.HTTP_200_OK)
        self.assertEqual(results_res.data['total_ballots_cast'], 2)
        self.assertTrue(results_res.data['tie'])
        self.assertEqual(len(results_res.data['tied_candidates']), 2)

    def test_results_publish_and_unpublish_cycle(self):
        """Owner can publish and unpublish results; non-published results are hidden from voters."""
        self.election.status = 'completed'
        self.election.save()
        compute_election_tally(self.election)

        self.client.force_authenticate(user=self.creator)

        # 1. Publish results
        pub_res = self.client.post(f'/api/elections/{self.election.id}/results/publish/')
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)

        # Voter can view published results
        self.client.force_authenticate(user=self.voter1)
        voter_view = self.client.get(f'/api/elections/{self.election.id}/results/')
        self.assertEqual(voter_view.status_code, status.HTTP_200_OK)
        self.assertTrue(voter_view.data['is_published'])

        # 2. Unpublish results (creator only)
        self.client.force_authenticate(user=self.creator)
        unpub_res = self.client.post(f'/api/results/{self.election.id}/unpublish/')
        self.assertEqual(unpub_res.status_code, status.HTTP_200_OK)

        # Voter can NO LONGER view unpublished results (returns 404 not found / not published)
        self.client.force_authenticate(user=self.voter1)
        voter_view_again = self.client.get(f'/api/elections/{self.election.id}/results/')
        self.assertEqual(voter_view_again.status_code, status.HTTP_404_NOT_FOUND)

    def test_export_pdf_and_csv_reports(self):
        """Export endpoints generate CSV and printable certified PDF HTML report."""
        self.election.status = 'completed'
        self.election.save()
        compute_election_tally(self.election)
        self.client.force_authenticate(user=self.creator)

        # CSV export (test via elections route)
        csv_res = self.client.get(f'/api/elections/{self.election.id}/reports/export/?format=csv')
        if csv_res.status_code != 200:
            print("CSV export error on elections route:", csv_res.status_code, csv_res.content)
        self.assertEqual(csv_res.status_code, status.HTTP_200_OK)
        self.assertEqual(csv_res['Content-Type'], 'text/csv')

        # PDF / Certified Printable HTML export
        pdf_res = self.client.get(f'/api/elections/{self.election.id}/reports/export/?format=pdf')
        self.assertEqual(pdf_res.status_code, status.HTTP_200_OK)
        self.assertIn('text/html', pdf_res['Content-Type'])
        self.assertIn(self.election.title, pdf_res.content.decode('utf-8'))
