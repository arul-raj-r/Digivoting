from django.test import TransactionTestCase
from django.utils import timezone
from django.urls import reverse
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient
from datetime import timedelta
import uuid

from authentication.models import User
from locations.models import State, District, Constituency
from voters.models import VoterProfile
from elections.models import Election
from candidates.models import PoliticalParty, Candidate, ElectionCandidate
from voting.models import Vote, VoteReceipt

class VotingEngineTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Create location structure
        self.state = State.objects.create(name="Tamil Nadu")
        self.district = District.objects.create(state=self.state, name="Chennai")
        self.const_a = Constituency.objects.create(district=self.district, name="Constituency A", description="District A")
        self.const_b = Constituency.objects.create(district=self.district, name="Constituency B", description="District B")
        
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
        self.admin_user = User.objects.create_superuser(
            username="admin1", 
            password="password123", 
            email="admin1@test.com",
            role=User.ADMIN
        )

        # 3. Create Voter Profiles
        self.voter_profile_1 = VoterProfile.objects.create(
            user=self.voter_user_1,
            voter_reference="VT000001",
            constituency=self.const_a,
            verification_status='VERIFIED',
            verification_method='MANUAL',
            verified_at=timezone.now(),
            verified_by=self.admin_user
        )
        self.voter_profile_2 = VoterProfile.objects.create(
            user=self.voter_user_2,
            voter_reference="VT000002",
            constituency=self.const_b,
            verification_status='PENDING'
        )

        # 4. Create Elections
        self.active_election = Election.objects.create(
            name="National Election 2026",
            description="Active Election",
            start_datetime=timezone.now() - timedelta(hours=1),
            end_datetime=timezone.now() + timedelta(hours=5),
            status='ACTIVE'
        )
        self.draft_election = Election.objects.create(
            name="Draft Election",
            description="Not open yet",
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=2),
            status='DRAFT'
        )

        # 5. Create Candidates
        self.party_a = PoliticalParty.objects.create(name="Alpha Party", symbol_tag="AP")
        self.party_b = PoliticalParty.objects.create(name="Beta Party", symbol_tag="BP")
        
        self.cand_a = Candidate.objects.create(name="Candidate Alpha", party=self.party_a)
        self.cand_b = Candidate.objects.create(name="Candidate Beta", party=self.party_b)
        self.cand_c = Candidate.objects.create(name="Candidate Gamma", party=self.party_a)

        # Link candidates to constituencies in election
        self.ec_const_a = ElectionCandidate.objects.create(
            election=self.active_election,
            constituency=self.const_a,
            candidate=self.cand_a,
            is_approved=True
        )
        self.ec_const_b = ElectionCandidate.objects.create(
            election=self.active_election,
            constituency=self.const_b,
            candidate=self.cand_b,
            is_approved=True
        )
        self.ec_unapproved = ElectionCandidate.objects.create(
            election=self.active_election,
            constituency=self.const_a,
            candidate=self.cand_c,
            is_approved=False
        )

    def test_successful_vote_cast(self):
        """
        Verify a verified voter can cast a vote for an approved candidate in their constituency.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('v1:vote_cast')
        
        response = self.client.post(url, {
            'candidate_id': str(self.cand_a.id),
            'election_id': str(self.active_election.id)
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('receipt_number', response.data)
        
        # Verify Vote and VoteReceipt records were created
        self.assertEqual(VoteReceipt.objects.filter(voter=self.voter_profile_1, election=self.active_election).count(), 1)
        self.assertEqual(Vote.objects.filter(election=self.active_election, candidate=self.cand_a).count(), 1)

    def test_unverified_voter_cannot_vote(self):
        """
        Verify unverified voters are blocked from casting a vote.
        """
        self.client.force_authenticate(user=self.voter_user_2)
        url = reverse('v1:vote_cast')
        
        response = self.client.post(url, {
            'candidate_id': str(self.cand_b.id),
            'election_id': str(self.active_election.id)
        }, format='json')
        
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
        url = reverse('v1:vote_cast')
        
        # Voter 1 tries to vote for Candidate Beta (Const B)
        response = self.client.post(url, {
            'candidate_id': str(self.cand_b.id),
            'election_id': str(self.active_election.id)
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not contesting in your constituency", response.data['error'])
        
        # Verify no vote was recorded
        self.assertEqual(VoteReceipt.objects.count(), 0)
        self.assertEqual(Vote.objects.count(), 0)

    def test_unapproved_candidate_cannot_receive_vote(self):
        """
        Verify voters cannot vote for unapproved candidates.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('v1:vote_cast')
        
        response = self.client.post(url, {
            'candidate_id': str(self.cand_c.id),
            'election_id': str(self.active_election.id)
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not contesting in your constituency", response.data['error'])

    def test_double_voting_prevention_sequential(self):
        """
        Verify a voter cannot submit a second vote for the same election sequentially.
        """
        self.client.force_authenticate(user=self.voter_user_1)
        url = reverse('v1:vote_cast')
        
        # First vote
        response1 = self.client.post(url, {
            'candidate_id': str(self.cand_a.id),
            'election_id': str(self.active_election.id)
        }, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second vote
        response2 = self.client.post(url, {
            'candidate_id': str(self.cand_a.id),
            'election_id': str(self.active_election.id)
        }, format='json')
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
        url = reverse('v1:vote_cast')
        
        results = []
        def cast_vote():
            client = APIClient()
            client.force_authenticate(user=self.voter_user_1)
            response = client.post(url, {
                'candidate_id': str(self.cand_a.id),
                'election_id': str(self.active_election.id)
            }, format='json')
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
