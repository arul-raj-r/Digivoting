from django.test import TransactionTestCase
from django.utils import timezone
from django.urls import reverse
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient
from datetime import timedelta
import uuid

from authentication.models import User
from voters.models import Constituency, Voter
from elections.models import Election, Candidate, Vote, VoteReceipt

class VotingEngineTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Create constituencies
        self.const_a = Constituency.objects.create(name="Constituency A", description="District A")
        self.const_b = Constituency.objects.create(name="Constituency B", description="District B")
        
        # 2. Create users
        self.voter_user_1 = User.objects.create_user(
            username="voter1", 
            password="password123", 
            email="voter1@test.com",
            role=User.VOTER
        )
        self.voter_user_2 = User.objects.create_user(
            username="voter2", 
            password="password123", 
            email="voter2@test.com",
            role=User.VOTER
        )
        self.admin_user = User.objects.create_user(
            username="admin1", 
            password="password123", 
            email="admin1@test.com",
            role=User.ADMIN
        )

        # 3. Create Voter Profiles
        self.voter_profile_1 = Voter.objects.create(
            user=self.voter_user_1,
            voter_id_number="VT000001",
            constituency=self.const_a,
            is_verified=True
        )
        self.voter_profile_2 = Voter.objects.create(
            user=self.voter_user_2,
            voter_id_number="VT000002",
            constituency=self.const_b,
            is_verified=False  # Unverified voter
        )

        # 4. Create Elections
        self.active_election = Election.objects.create(
            title="National Election 2026",
            description="Active Election",
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=5),
            status=Election.ACTIVE
        )
        self.draft_election = Election.objects.create(
            title="Draft Election",
            description="Not open yet",
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=2),
            status=Election.DRAFT
        )

        # 5. Create Candidates
        self.cand_const_a = Candidate.objects.create(
            election=self.active_election,
            constituency=self.const_a,
            name="Candidate Alpha",
            party_name="Alpha Party",
            is_approved=True
        )
        self.cand_const_b = Candidate.objects.create(
            election=self.active_election,
            constituency=self.const_b,
            name="Candidate Beta",
            party_name="Beta Party",
            is_approved=True
        )
        self.cand_unapproved = Candidate.objects.create(
            election=self.active_election,
            constituency=self.const_a,
            name="Candidate Gamma",
            party_name="Gamma Party",
            is_approved=False
        )

    def test_successful_vote_cast(self):
        """
        Verify a verified voter can cast a vote for an approved candidate in their constituency.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('vote_cast')
        
        response = self.client.post(url, {'candidate_id': str(self.cand_const_a.id)}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('receipt_number', response.data)
        
        # Verify Vote and VoteReceipt records were created
        self.assertEqual(VoteReceipt.objects.filter(voter=self.voter_profile_1, election=self.active_election).count(), 1)
        self.assertEqual(Vote.objects.filter(election=self.active_election, candidate=self.cand_const_a).count(), 1)

    def test_unverified_voter_cannot_vote(self):
        """
        Verify unverified voters are blocked from casting a vote.
        """
        self.client.force_authenticate(user=self.voter_user_2)
        url = reverse('vote_cast')
        
        response = self.client.post(url, {'candidate_id': str(self.cand_const_b.id)}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        
        # Verify no vote was recorded
        self.assertEqual(VoteReceipt.objects.count(), 0)
        self.assertEqual(Vote.objects.count(), 0)

    def test_constituency_mismatch_cannot_vote(self):
        """
        Verify a voter cannot vote for a candidate in another constituency.
        """
        self.client.force_authenticate(user=self.voter_user_1)  # Registered in Const A
        url = reverse('vote_cast')
        
        # Voter 1 tries to vote for Candidate Beta (Const B)
        response = self.client.post(url, {'candidate_id': str(self.cand_const_b.id)}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Constituency mismatch", response.data['error'])
        
        # Verify no vote was recorded
        self.assertEqual(VoteReceipt.objects.count(), 0)
        self.assertEqual(Vote.objects.count(), 0)

    def test_unapproved_candidate_cannot_receive_vote(self):
        """
        Verify voters cannot vote for unapproved candidates.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('vote_cast')
        
        response = self.client.post(url, {'candidate_id': str(self.cand_unapproved.id)}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not approved", response.data['error'])

    def test_double_voting_prevention_sequential(self):
        """
        Verify a voter cannot submit a second vote for the same election sequentially.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('vote_cast')
        
        # First vote
        response1 = self.client.post(url, {'candidate_id': str(self.cand_const_a.id)}, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second vote
        response2 = self.client.post(url, {'candidate_id': str(self.cand_const_a.id)}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Double voting detected", response2.data['error'])
        
        # Verify database has exactly one vote receipt
        self.assertEqual(VoteReceipt.objects.filter(voter=self.voter_profile_1, election=self.active_election).count(), 1)
        self.assertEqual(Vote.objects.filter(election=self.active_election).count(), 1)

    def test_database_level_unique_together_constraint(self):
        """
        Directly verify the database-level unique constraint on VoteReceipt.
        If two concurrent threads bypass API validation, the database unique_together will catch it.
        """
        # Create first receipt
        VoteReceipt.objects.create(
            election=self.active_election,
            voter=self.voter_profile_1,
            receipt_number="RECEIPT_HASH_1"
        )
        
        # Attempt to insert a second receipt for the same voter and election
        with self.assertRaises(IntegrityError):
            VoteReceipt.objects.create(
                election=self.active_election,
                voter=self.voter_profile_1,
                receipt_number="RECEIPT_HASH_2"
            )

    def test_concurrent_double_voting(self):
        """
        Verify that under concurrent requests, only one vote goes through and the other returns 400.
        """
        import threading
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('vote_cast')
        
        results = []
        def cast_vote():
            client = APIClient()
            client.force_authenticate(user=self.voter_user_1)
            response = client.post(url, {'candidate_id': str(self.cand_const_a.id)}, format='json')
            results.append(response)

        threads = [threading.Thread(target=cast_vote) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # One should succeed (201) and one should fail (400 due to unique constraint / double voting check)
        status_codes = [r.status_code for r in results]
        self.assertIn(status.HTTP_201_CREATED, status_codes)
        self.assertIn(status.HTTP_400_BAD_REQUEST, status_codes)
        
        # Verify exactly one receipt and one vote exist
        self.assertEqual(VoteReceipt.objects.filter(voter=self.voter_profile_1, election=self.active_election).count(), 1)
        self.assertEqual(Vote.objects.filter(election=self.active_election).count(), 1)
