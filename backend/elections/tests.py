from django.test import TransactionTestCase
from django.utils import timezone
from django.urls import reverse
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from datetime import timedelta
import uuid

from authentication.models import User
from locations.models import State, District, Constituency
from voters.models import VoterProfile
from elections.models import Election, EligibleVoter, Candidate as ElectionCandidateModel, ElectionVerificationConfig, ElectionRules
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
            title="National Election 2026",
            description="Active Election",
            created_by=self.admin_user,
            start_datetime=timezone.now() - timedelta(hours=1),
            end_datetime=timezone.now() + timedelta(hours=5),
            status='ACTIVE'
        )
        self.draft_election = Election.objects.create(
            title="Draft Election",
            description="Not open yet",
            created_by=self.admin_user,
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=2),
            status='draft'
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
            from django.db import connection
            connection.close()
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


class ElectionCreationModuleTests(TransactionTestCase):
    """
    Automated verification suite for Election Creation Module (Module 8).
    Tests all requirements and edge cases from prompt verification checklist.
    """
    def setUp(self):
        self.client = APIClient()

        # Users with different roles
        self.creator_user_1 = User.objects.create_user(
            username="creator1",
            email="creator1@election.gov",
            password="Password123!",
            role=User.ELECTION_CREATOR
        )
        self.creator_user_2 = User.objects.create_user(
            username="creator2",
            email="creator2@election.gov",
            password="Password123!",
            role=User.ELECTION_CREATOR
        )
        self.voter_user = User.objects.create_user(
            username="regular_voter",
            email="voter@citizen.gov",
            password="Password123!",
            role=User.VOTER
        )
        self.admin_user = User.objects.create_superuser(
            username="platform_admin",
            email="admin@digivote.gov",
            password="Password123!",
            role=User.ADMIN
        )

        # Existing draft election by creator 1
        self.election_1 = Election.objects.create(
            title="General Elections 2026",
            description="Parliamentary election cycle",
            election_type="general",
            status="draft",
            created_by=self.creator_user_1
        )

    def test_authenticated_user_can_create_draft_election(self):
        """
        Verification in Unified Platform: Any authenticated user can create their own election in draft.
        """
        self.client.force_authenticate(user=self.voter_user)
        response = self.client.post('/api/elections/', {
            'title': 'User Initiated Election',
            'election_type': 'general'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'draft')
        self.assertEqual(response.data['created_by'], self.voter_user.id)

    def test_user_cannot_modify_another_creators_election(self):
        """
        Verification: User A gets 403 when attempting to modify an election created by User B.
        """
        self.client.force_authenticate(user=self.voter_user)
        response = self.client.patch(f'/api/elections/{self.election_1.id}/', {
            'title': 'Tampered Election Title'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_gets_401_on_post(self):
        """
        Verification: Unauthenticated user gets 401 on POST /api/elections/
        """
        response = self.client.post('/api/elections/', {
            'title': 'Anonymous Election',
            'election_type': 'general'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_election_creator_can_create_draft_election(self):
        """
        Verification: Election creator can create an election, which defaults to status='draft'
        regardless of what the client sends in request body.
        """
        self.client.force_authenticate(user=self.creator_user_1)
        response = self.client.post('/api/elections/', {
            'title': 'State Assembly Poll 2026',
            'description': 'General Assembly voting',
            'election_type': 'organizational',
            'status': 'active' # Client attempts to tamper status to active
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data['title'], 'State Assembly Poll 2026')
        self.assertEqual(data['election_type'], 'organizational')
        self.assertEqual(data['status'], 'draft') # Must remain 'draft'
        self.assertEqual(data['is_locked'], False)
        self.assertEqual(data['created_by'], self.creator_user_1.id)

    def test_title_validation_rejects_empty_or_whitespace(self):
        """
        Verification: Title validation rejects empty or whitespace-only strings with 400.
        """
        self.client.force_authenticate(user=self.creator_user_1)

        # Empty string
        res1 = self.client.post('/api/elections/', {
            'title': '',
            'election_type': 'general'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Whitespace string
        res2 = self.client.post('/api/elections/', {
            'title': '     ',
            'election_type': 'general'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_description_length_limit_enforced_server_side(self):
        """
        Verification: Description > 2000 characters is rejected with 400.
        """
        self.client.force_authenticate(user=self.creator_user_1)
        long_description = "A" * 2001

        response = self.client.post('/api/elections/', {
            'title': 'Test Election Long Desc',
            'description': long_description,
            'election_type': 'poll'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_creator_can_only_list_their_own_elections(self):
        """
        Verification: Election creators only see their own elections; platform admins can see all.
        """
        # Create election by Creator 2
        election_2 = Election.objects.create(
            title="Creator 2 Poll",
            election_type="poll",
            status="draft",
            created_by=self.creator_user_2
        )

        # 1. Creator 1 views list
        self.client.force_authenticate(user=self.creator_user_1)
        res1 = self.client.get('/api/elections/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        election_ids_1 = [e['id'] for e in res1.data]
        self.assertIn(str(self.election_1.id), election_ids_1)
        self.assertNotIn(str(election_2.id), election_ids_1)

        # 2. Platform Admin views list
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get('/api/elections/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        all_ids = [e['id'] for e in res_admin.data]
        self.assertIn(str(self.election_1.id), all_ids)
        self.assertIn(str(election_2.id), all_ids)

    def test_detail_view_permissions(self):
        """
        Verification: GET /api/elections/<id>/ allows creator and admin; rejects other creators with 403.
        """
        # Creator 1 views their own
        self.client.force_authenticate(user=self.creator_user_1)
        res1 = self.client.get(f'/api/elections/{self.election_1.id}/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Platform admin views Creator 1's election
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get(f'/api/elections/{self.election_1.id}/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        # Creator 2 attempts to view Creator 1's election -> 403
        self.client.force_authenticate(user=self.creator_user_2)
        res2 = self.client.get(f'/api/elections/{self.election_1.id}/')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_draft_election_succeeds(self):
        """
        Verification: Creator can edit title/description/type while status=='draft'.
        """
        self.client.force_authenticate(user=self.creator_user_1)
        response = self.client.patch(f'/api/elections/{self.election_1.id}/', {
            'title': 'Updated Election Title',
            'description': 'Updated description'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.election_1.refresh_from_db()
        self.assertEqual(self.election_1.title, 'Updated Election Title')
        self.assertEqual(self.election_1.description, 'Updated description')

    def test_patch_non_draft_election_is_rejected(self):
        """
        Verification: Editing an election after status becomes 'active' or 'completed' is rejected with 400.
        """
        # Advance status to 'active'
        self.election_1.status = 'active'
        self.election_1.save()

        self.client.force_authenticate(user=self.creator_user_1)
        response = self.client.patch(f'/api/elections/{self.election_1.id}/', {
            'title': 'Should Fail'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be edited", response.data['error'])

    def test_delete_draft_election_succeeds(self):
        """
        Verification: Creator can delete draft election.
        """
        self.client.force_authenticate(user=self.creator_user_1)
        response = self.client.delete(f'/api/elections/{self.election_1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Election.objects.filter(id=self.election_1.id).exists())

    def test_delete_non_draft_election_is_rejected(self):
        """
        Verification: Deleting a non-draft election (e.g. 'active') is rejected with 400.
        """
        self.election_1.status = 'active'
        self.election_1.save()

        self.client.force_authenticate(user=self.creator_user_1)
        response = self.client.delete(f'/api/elections/{self.election_1.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be deleted", response.data['error'])
        self.assertTrue(Election.objects.filter(id=self.election_1.id).exists())


class VoterAndCandidateModuleTests(TransactionTestCase):
    """
    Module 9 Verification Suite:
    - Non-owner gets 403 on voter and candidate endpoints
    - Duplicate email rejection in voter roll
    - Bulk CSV upload with partial success and row-level breakdown
    - Bulk CSV ceiling limits
    - Status gating (roll changes rejected when scheduled/active)
    - Candidate photo validation (size and format)
    - Atomic candidate ballot reordering
    - Status transition from 'draft' -> 'configured' prerequisite gate
    - has_voted read-only integrity
    """
    def setUp(self):
        self.client = APIClient()

        # 1. Creators and Users
        self.creator_1 = User.objects.create_user(
            username="creator_mod9_1",
            email="creator1_m9@election.gov",
            password="Password123!",
            role=User.ELECTION_CREATOR
        )
        self.creator_2 = User.objects.create_user(
            username="creator_mod9_2",
            email="creator2_m9@election.gov",
            password="Password123!",
            role=User.ELECTION_CREATOR
        )
        self.registered_voter = User.objects.create_user(
            username="registered_citizen",
            email="citizen@gov.in",
            password="Password123!",
            role=User.VOTER,
            first_name="Citizen",
            last_name="One"
        )

        # 2. Election
        self.election = Election.objects.create(
            title="Lok Sabha Module 9 Test Poll",
            description="Testing voter and candidate configuration",
            election_type="general",
            status="draft",
            created_by=self.creator_1
        )

    def test_non_owner_creator_gets_403_on_voter_and_candidate_endpoints(self):
        """
        Verification: Non-owner (Creator 2) receives 403 on voter and candidate endpoints.
        """
        self.client.force_authenticate(user=self.creator_2)
        
        # Voter endpoints
        res_voter_get = self.client.get(f'/api/elections/{self.election.id}/voters/')
        self.assertEqual(res_voter_get.status_code, status.HTTP_403_FORBIDDEN)

        res_voter_post = self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'voter@test.com'}, format='json')
        self.assertEqual(res_voter_post.status_code, status.HTTP_403_FORBIDDEN)

        # Candidate endpoints
        res_cand_get = self.client.get(f'/api/elections/{self.election.id}/candidates/')
        self.assertEqual(res_cand_get.status_code, status.HTTP_403_FORBIDDEN)

        res_cand_post = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Unauthorized Cand'}, format='json')
        self.assertEqual(res_cand_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_single_voter_add_and_duplicate_rejection(self):
        """
        Verification: Creator can add voter by email, and duplicates in same election are rejected with 400.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # 1. Add registered user by email
        res1 = self.client.post(f'/api/elections/{self.election.id}/voters/', {
            'email': 'citizen@gov.in'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['email'], 'citizen@gov.in')
        self.assertTrue(res1.data['is_registered_user'])
        self.assertEqual(res1.data['has_voted'], False)

        # 2. Add duplicate email in same election -> 400
        res2 = self.client.post(f'/api/elections/{self.election.id}/voters/', {
            'email': 'citizen@gov.in'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_csv_upload_with_partial_success_and_row_reporting(self):
        """
        Verification: Bulk CSV upload with mixed valid, duplicate, and malformed rows reports per-row breakdown.
        """
        self.client.force_authenticate(user=self.creator_1)
        from django.core.files.uploadedfile import SimpleUploadedFile

        csv_content = (
            "email\n"
            "valid1@example.com\n"
            "malformed-email\n"
            "valid2@example.com\n"
            "valid1@example.com\n" # Duplicate within CSV
        ).encode('utf-8')

        uploaded_file = SimpleUploadedFile("voters.csv", csv_content, content_type="text/csv")

        response = self.client.post(
            f'/api/elections/{self.election.id}/voters/bulk-upload/',
            {'file': uploaded_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['success_count'], 2) # valid1, valid2
        self.assertEqual(data['failed_count'], 1)  # malformed-email
        self.assertEqual(data['skipped_count'], 1) # duplicate valid1

    def test_voter_and_candidate_mutations_blocked_after_scheduled(self):
        """
        Verification: Voter roll and candidate roster changes are rejected once election status is 'scheduled' or beyond.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # Add 1 voter and 1 candidate first
        voter_res = self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'v1@test.com'}, format='json')
        voter_id = voter_res.data['id']
        cand_res = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate 1'}, format='json')
        cand_id = cand_res.data['id']

        # Advance election status to scheduled
        self.election.status = 'scheduled'
        self.election.save()

        # 1. Attempt to add new voter
        res_v_add = self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'v2@test.com'}, format='json')
        self.assertEqual(res_v_add.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Attempt to delete voter
        res_v_del = self.client.delete(f'/api/elections/{self.election.id}/voters/{voter_id}/')
        self.assertEqual(res_v_del.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Attempt to add candidate
        res_c_add = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate 2'}, format='json')
        self.assertEqual(res_c_add.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Attempt to edit candidate
        res_c_edit = self.client.patch(f'/api/elections/{self.election.id}/candidates/{cand_id}/', {'full_name': 'Candidate Renamed'}, format='json')
        self.assertEqual(res_c_edit.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Attempt to reorder candidates
        res_reorder = self.client.post(f'/api/elections/{self.election.id}/candidates/reorder/', {'candidate_ids': [cand_id]}, format='json')
        self.assertEqual(res_reorder.status_code, status.HTTP_400_BAD_REQUEST)

    def test_candidate_photo_validation(self):
        """
        Verification: Server rejects candidate photos exceeding 5MB or with non-image format.
        """
        self.client.force_authenticate(user=self.creator_1)
        from django.core.files.uploadedfile import SimpleUploadedFile

        # 1. Non-image file (e.g. text file disguised or with text/plain)
        fake_photo = SimpleUploadedFile("resume.pdf", b"fake pdf content", content_type="application/pdf")
        res1 = self.client.post(
            f'/api/elections/{self.election.id}/candidates/',
            {'full_name': 'Candidate With PDF', 'photo': fake_photo},
            format='multipart'
        )
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('photo', res1.data)

        # 2. Oversized photo (> 5MB)
        large_bytes = b"0" * (5 * 1024 * 1024 + 1024)
        large_photo = SimpleUploadedFile("big.png", large_bytes, content_type="image/png")
        res2 = self.client.post(
            f'/api/elections/{self.election.id}/candidates/',
            {'full_name': 'Candidate Big Photo', 'photo': large_photo},
            format='multipart'
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('photo', res2.data)

    def test_atomic_candidate_reordering(self):
        """
        Verification: Reorder endpoint updates display_order atomically and rejects mismatched ID lists.
        """
        self.client.force_authenticate(user=self.creator_1)

        c1 = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate A'}, format='json').data
        c2 = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate B'}, format='json').data
        c3 = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate C'}, format='json').data

        # Reverse display order: c3, c1, c2
        reorder_res = self.client.post(f'/api/elections/{self.election.id}/candidates/reorder/', {
            'candidate_ids': [c3['id'], c1['id'], c2['id']]
        }, format='json')

        self.assertEqual(reorder_res.status_code, status.HTTP_200_OK)
        ordered_names = [cand['full_name'] for cand in reorder_res.data]
        self.assertEqual(ordered_names, ['Candidate C', 'Candidate A', 'Candidate B'])

        # Incomplete ID list should be rejected with 400
        bad_reorder = self.client.post(f'/api/elections/{self.election.id}/candidates/reorder/', {
            'candidate_ids': [c3['id']]
        }, format='json')
        self.assertEqual(bad_reorder.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_transition_to_configured_gate(self):
        """
        Verification:
        - Transitioning status: 'draft' -> 'configured' fails if voters is empty.
        - Fails if candidates is empty.
        - Succeeds once both voters >= 1 and candidates >= 1 exist.
        """
        self.client.force_authenticate(user=self.creator_1)

        # 1. Attempt to configure with 0 voters and 0 candidates -> 400
        res1 = self.client.patch(f'/api/elections/{self.election.id}/', {'status': 'configured'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least one eligible voter and at least one candidate", str(res1.data))

        # 2. Add 1 voter only -> 400
        self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'voter1@test.com'}, format='json')
        res2 = self.client.patch(f'/api/elections/{self.election.id}/', {'status': 'configured'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least one candidate", str(res2.data))

        # 3. Add 1 candidate -> Now both are present -> Should succeed with 200
        self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Candidate 1'}, format='json')
        res3 = self.client.patch(f'/api/elections/{self.election.id}/', {'status': 'configured'}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(res3.data['status'], 'configured')

    def test_has_voted_read_only_integrity(self):
        """
        Verification: Attempts to set has_voted=True in voter endpoints are ignored.
        """
        self.client.force_authenticate(user=self.creator_1)
        res = self.client.post(f'/api/elections/{self.election.id}/voters/', {
            'email': 'honest_voter@test.com',
            'has_voted': True
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['has_voted'], False)


class VerificationAndScheduleRulesModuleTests(APITestCase):
    """
    Automated Test Suite for Module 10:
    - Default auto-creation via signals
    - Ownership and permissions checks
    - Verification config toggles (including forward-looking biometrics)
    - Election rules & result visibility timing
    - Dual-point validation of results_visible_at vs end_datetime
    - Scheduling & transition gates ('configured' -> 'scheduled')
    - Rescheduling while in 'scheduled' status
    - Rejection of rules/verification edits once 'scheduled' or beyond
    """

    def setUp(self):
        self.client = APIClient()
        self.creator_1 = User.objects.create_user(
            username="creator1",
            email="creator1@digivote.gov.in",
            password="StrongPassword123!",
            role=User.ELECTION_CREATOR
        )
        self.creator_2 = User.objects.create_user(
            username="creator2",
            email="creator2@digivote.gov.in",
            password="StrongPassword123!",
            role=User.ELECTION_CREATOR
        )
        self.admin_user = User.objects.create_user(
            username="adminuser",
            email="admin@digivote.gov.in",
            password="StrongPassword123!",
            role=User.ADMIN,
            is_staff=True
        )

        # Create baseline draft election
        self.election = Election.objects.create(
            created_by=self.creator_1,
            title="Sovereign National Assembly 2026",
            election_type="general",
            status="draft"
        )

    def test_auto_creation_of_verification_config_and_rules(self):
        """
        Test: New election automatically gets default ElectionVerificationConfig and ElectionRules rows.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # Verify Verification Config
        res_v = self.client.get(f'/api/elections/{self.election.id}/verification-config/')
        self.assertEqual(res_v.status_code, status.HTTP_200_OK)
        self.assertEqual(res_v.data['require_email_otp'], True)
        self.assertEqual(res_v.data['require_webcam_verification'], False)
        self.assertEqual(res_v.data['require_biometric_verification'], False)

        # Verify Rules
        res_r = self.client.get(f'/api/elections/{self.election.id}/rules/')
        self.assertEqual(res_r.status_code, status.HTTP_200_OK)
        self.assertEqual(res_r.data['results_visibility'], 'manual')
        self.assertEqual(res_r.data['allow_vote_change'], False)
        self.assertIsNone(res_r.data['results_visible_at'])

    def test_ownership_permissions_on_verification_and_rules(self):
        """
        Test: Non-owner creator gets 403; Platform Admin gets 200.
        """
        self.client.force_authenticate(user=self.creator_2)
        
        # Creator 2 cannot view or update Creator 1's election verification/rules
        res1 = self.client.get(f'/api/elections/{self.election.id}/verification-config/')
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)
        res2 = self.client.patch(f'/api/elections/{self.election.id}/rules/', {'results_visibility': 'immediate'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user can view
        self.client.force_authenticate(user=self.admin_user)
        res3 = self.client.get(f'/api/elections/{self.election.id}/verification-config/')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

    def test_update_verification_config_including_biometrics(self):
        """
        Test: Creator can update verification flags including require_biometric_verification.
        """
        self.client.force_authenticate(user=self.creator_1)
        res = self.client.patch(f'/api/elections/{self.election.id}/verification-config/', {
            'require_webcam_verification': True,
            'require_biometric_verification': True
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['require_webcam_verification'], True)
        self.assertEqual(res.data['require_biometric_verification'], True)

    def test_rules_scheduled_visibility_validation(self):
        """
        Test: 'scheduled' results_visibility requires results_visible_at and must be after end_datetime.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # 1. Missing results_visible_at -> 400
        res1 = self.client.patch(f'/api/elections/{self.election.id}/rules/', {
            'results_visibility': 'scheduled'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('results_visible_at', res1.data)

        # 2. Valid results_visible_at when end_datetime is not yet set -> 200
        future_visible = timezone.now() + timedelta(days=10)
        res2 = self.client.patch(f'/api/elections/{self.election.id}/rules/', {
            'results_visibility': 'scheduled',
            'results_visible_at': future_visible.isoformat()
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['results_visibility'], 'scheduled')

    def test_dual_point_cross_field_revalidation_at_scheduling_time(self):
        """
        Critical Test: Creator sets scheduled results release, then sets end_datetime AFTER
        the results release date -> Status transition to 'scheduled' must be REJECTED.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # Step 1: Configure voters and candidates to satisfy configured status
        self.election.status = 'configured'
        self.election.save()
        EligibleVoter.objects.create(election=self.election, email='voter@test.com')
        ElectionCandidateModel.objects.create(election=self.election, full_name='Candidate A')

        # Step 2: Set results_visibility='scheduled' with results_visible_at = Day +2
        results_time = timezone.now() + timedelta(days=2)
        self.client.patch(f'/api/elections/{self.election.id}/rules/', {
            'results_visibility': 'scheduled',
            'results_visible_at': results_time.isoformat()
        }, format='json')

        # Step 3: Creator attempts to schedule election with end_datetime = Day +5 (AFTER results release!)
        start_time = timezone.now() + timedelta(days=1)
        end_time = timezone.now() + timedelta(days=5)

        res = self.client.patch(f'/api/elections/{self.election.id}/', {
            'start_datetime': start_time.isoformat(),
            'end_datetime': end_time.isoformat(),
            'status': 'scheduled'
        }, format='json')

        # Must reject with specific cross-field invariant message
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("must be strictly after the election end time", str(res.data))

        # Step 4: Fix results release time to Day +6 (after Day +5) and retry -> Succeeds!
        self.client.patch(f'/api/elections/{self.election.id}/rules/', {
            'results_visibility': 'scheduled',
            'results_visible_at': (timezone.now() + timedelta(days=6)).isoformat()
        }, format='json')

        res_ok = self.client.patch(f'/api/elections/{self.election.id}/', {
            'start_datetime': start_time.isoformat(),
            'end_datetime': end_time.isoformat(),
            'status': 'scheduled'
        }, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['status'], 'scheduled')

    def test_dates_ordering_and_future_validation(self):
        """
        Test: start_datetime in past or end_datetime <= start_datetime is rejected.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # 1. Start date in past
        res1 = self.client.patch(f'/api/elections/{self.election.id}/', {
            'start_datetime': (timezone.now() - timedelta(hours=1)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(hours=2)).isoformat()
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('start_datetime', res1.data)

        # 2. End date before start date
        res2 = self.client.patch(f'/api/elections/{self.election.id}/', {
            'start_datetime': (timezone.now() + timedelta(days=2)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=1)).isoformat()
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_datetime', res2.data)

    def test_locking_verification_and_rules_once_scheduled(self):
        """
        Test: Verification config and rules are NOT editable once election is 'scheduled'.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        # Move election to scheduled
        self.election.status = 'scheduled'
        self.election.start_datetime = timezone.now() + timedelta(days=1)
        self.election.end_datetime = timezone.now() + timedelta(days=2)
        self.election.save()

        # Try to edit verification config -> 400
        res_v = self.client.patch(f'/api/elections/{self.election.id}/verification-config/', {
            'require_email_otp': False
        }, format='json')
        self.assertEqual(res_v.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Verification rules are locked", str(res_v.data))

        # Try to edit rules -> 400
        res_r = self.client.patch(f'/api/elections/{self.election.id}/rules/', {
            'allow_vote_change': True
        }, format='json')
        self.assertEqual(res_r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Rules are locked", str(res_r.data))

    def test_rescheduling_allowed_in_scheduled_rejected_in_active(self):
        """
        Test: Editing dates is allowed while status=='scheduled', but rejected when 'active'.
        """
        self.client.force_authenticate(user=self.creator_1)
        
        self.election.status = 'scheduled'
        self.election.start_datetime = timezone.now() + timedelta(days=1)
        self.election.end_datetime = timezone.now() + timedelta(days=2)
        self.election.save()

        # Rescheduling (editing dates while scheduled) -> Succeeds
        res = self.client.patch(f'/api/elections/{self.election.id}/', {
            'start_datetime': (timezone.now() + timedelta(days=2)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=4)).isoformat()
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Set status to active -> Now edits are rejected
        self.election.status = 'active'
        self.election.save()

        res_active = self.client.patch(f'/api/elections/{self.election.id}/', {
            'title': 'Cannot change title while active'
        }, format='json')
        self.assertEqual(res_active.status_code, status.HTTP_400_BAD_REQUEST)


class ElectionModule11Tests(APITestCase):
    """
    Comprehensive automated test suite for Module 11:
    - Manual start control (normal vs early force)
    - Defense-in-depth: empty voter roll or candidate roster rejects start even with force=True
    - Configuration locking across all Module 9 & 10 endpoints once active or locked
    - Emergency stop control (validation, cancellation, irreversibility)
    - No resume endpoint
    - Automatic idempotent transitions via management command
    - Monitoring and turnout aggregation (zero division safe, candidate privacy)
    - Comprehensive audit trail
    """

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            username="creator_m11",
            email="creator_m11@digivote.gov.in",
            password="StrongPassword123!",
            role=User.ELECTION_CREATOR
        )
        self.other_user = User.objects.create_user(
            username="other_m11",
            email="other_m11@digivote.gov.in",
            password="StrongPassword123!",
            role=User.ELECTION_CREATOR
        )
        self.election = Election.objects.create(
            created_by=self.creator,
            title="Module 11 Test Parliamentary Election",
            election_type="general",
            status="scheduled",
            start_datetime=timezone.now() + timedelta(hours=2),
            end_datetime=timezone.now() + timedelta(hours=6)
        )

    def test_manual_start_defense_in_depth_empty_voters_or_candidates_rejected(self):
        """
        Defense-in-depth: Start is rejected if voters or candidates are empty,
        even if force=True is provided.
        """
        self.client.force_authenticate(user=self.creator)

        # 1. Both empty, force=True -> Rejected
        res = self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least one eligible voter and at least one candidate", str(res.data))

        # 2. Add voter only -> Still rejected
        EligibleVoter.objects.create(election=self.election, email="voter1@test.com")
        res2 = self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No candidates are registered", str(res2.data))

        # 3. Clear voter, add candidate only -> Still rejected
        self.election.eligible_voters.all().delete()
        ElectionCandidateModel.objects.create(election=self.election, full_name="Candidate One")
        res3 = self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No eligible voters are registered", str(res3.data))

    def test_early_start_requires_force_param(self):
        """
        Early start (before start_datetime) without force=True is rejected with 400.
        With force=True, it succeeds, sets is_locked=True and records actual_start_at.
        """
        self.client.force_authenticate(user=self.creator)

        # Populate required voter and candidate
        EligibleVoter.objects.create(election=self.election, email="voter@test.com")
        ElectionCandidateModel.objects.create(election=self.election, full_name="Candidate A")

        # Without force -> 400
        res = self.client.post(f'/api/elections/{self.election.id}/start/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('is_early'), True)

        # With force=True -> 200
        res_force = self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')
        self.assertEqual(res_force.status_code, status.HTTP_200_OK)

        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'active')
        self.assertTrue(self.election.is_locked)
        self.assertIsNotNone(self.election.actual_start_at)

        # Verify audit log captures 'started' action with early_start=True
        audit_entry = self.election.audit_logs.filter(action='started').first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.details.get('early_start'), True)
        self.assertEqual(audit_entry.details.get('forced'), True)

    def test_all_module_9_and_10_endpoints_reject_when_locked(self):
        """
        Verifies that once election is active/locked, all mutating endpoints for
        voters, candidates, verification config, and rules are rejected.
        """
        self.client.force_authenticate(user=self.creator)

        # Setup valid election and start it
        voter = EligibleVoter.objects.create(election=self.election, email="existing@test.com")
        candidate = ElectionCandidateModel.objects.create(election=self.election, full_name="Candidate Prime")
        self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')

        # 1. Add Voter -> Blocked
        res_v_add = self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'new@test.com'}, format='json')
        self.assertEqual(res_v_add.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Delete Voter -> Blocked
        res_v_del = self.client.delete(f'/api/elections/{self.election.id}/voters/{voter.id}/')
        self.assertEqual(res_v_del.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Add Candidate -> Blocked
        res_c_add = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'New Candidate'}, format='json')
        self.assertEqual(res_c_add.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Edit Candidate -> Blocked
        res_c_edit = self.client.patch(f'/api/elections/{self.election.id}/candidates/{candidate.id}/', {'full_name': 'Changed Name'}, format='json')
        self.assertEqual(res_c_edit.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Delete Candidate -> Blocked
        res_c_del = self.client.delete(f'/api/elections/{self.election.id}/candidates/{candidate.id}/')
        self.assertEqual(res_c_del.status_code, status.HTTP_400_BAD_REQUEST)

        # 6. Reorder Candidates -> Blocked
        res_c_reorder = self.client.post(f'/api/elections/{self.election.id}/candidates/reorder/', {'candidate_ids': [str(candidate.id)]}, format='json')
        self.assertEqual(res_c_reorder.status_code, status.HTTP_400_BAD_REQUEST)

        # 7. Edit Verification Config -> Blocked
        res_vc = self.client.patch(f'/api/elections/{self.election.id}/verification-config/', {'require_email_otp': False}, format='json')
        self.assertEqual(res_vc.status_code, status.HTTP_400_BAD_REQUEST)

        # 8. Edit Rules -> Blocked
        res_r = self.client.patch(f'/api/elections/{self.election.id}/rules/', {'results_visibility': 'immediate'}, format='json')
        self.assertEqual(res_r.status_code, status.HTTP_400_BAD_REQUEST)

        # 9. Edit election details -> Blocked
        res_e = self.client.patch(f'/api/elections/{self.election.id}/', {'title': 'New Title'}, format='json')
        self.assertEqual(res_e.status_code, status.HTTP_400_BAD_REQUEST)

    def test_emergency_stop_validation_and_cancellation(self):
        """
        Emergency stop: requires reason >= 20 chars, sets status='cancelled', records stopped_at,
        stop_reason, stopped_by, and logs 'stopped'.
        """
        self.client.force_authenticate(user=self.creator)
        EligibleVoter.objects.create(election=self.election, email="voter@test.com")
        ElectionCandidateModel.objects.create(election=self.election, full_name="Candidate A")
        self.client.post(f'/api/elections/{self.election.id}/start/', {'force': True}, format='json')

        # 1. Stop without reason -> 400
        res_no_reason = self.client.post(f'/api/elections/{self.election.id}/stop/', {}, format='json')
        self.assertEqual(res_no_reason.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Stop with reason < 20 chars -> 400
        res_short_reason = self.client.post(f'/api/elections/{self.election.id}/stop/', {'reason': 'Too short'}, format='json')
        self.assertEqual(res_short_reason.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid stop reason
        valid_reason = "Emergency stop initiated due to critical network anomaly on secure voting gateway."
        res_stop = self.client.post(f'/api/elections/{self.election.id}/stop/', {'reason': valid_reason}, format='json')
        self.assertEqual(res_stop.status_code, status.HTTP_200_OK)

        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'cancelled')
        self.assertIsNotNone(self.election.stopped_at)
        self.assertEqual(self.election.stop_reason, valid_reason)
        self.assertEqual(self.election.stopped_by, self.creator)

        # Audit log verification
        audit_entry = self.election.audit_logs.filter(action='stopped').first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.details.get('reason'), valid_reason)

    def test_no_resume_endpoint_exists(self):
        """
        Confirms no resume endpoint exists for a cancelled election.
        """
        self.client.force_authenticate(user=self.creator)
        res = self.client.post(f'/api/elections/{self.election.id}/resume/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_check_election_transitions_command_idempotency(self):
        """
        Verifies automatic transitions (scheduled -> active, active -> completed)
        using check_election_transitions command, and ensures running it twice is idempotent.
        """
        from django.core.management import call_command

        # Set start_datetime in past
        self.election.start_datetime = timezone.now() - timedelta(minutes=5)
        self.election.end_datetime = timezone.now() + timedelta(hours=2)
        self.election.save()

        # Run command first time -> transitions to active
        call_command('check_election_transitions')
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'active')
        self.assertTrue(self.election.is_locked)
        self.assertIsNotNone(self.election.actual_start_at)

        # Run command second time -> remains active, no double logs or errors
        call_command('check_election_transitions')
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'active')
        transition_logs_count = self.election.audit_logs.filter(action='auto_transitioned').count()
        self.assertEqual(transition_logs_count, 1)

        # Now simulate end_datetime in past
        self.election.end_datetime = timezone.now() - timedelta(minutes=1)
        self.election.save()

        # Run command -> transitions to completed
        call_command('check_election_transitions')
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'completed')

        # Running again -> idempotent
        call_command('check_election_transitions')
        self.election.refresh_from_db()
        self.assertEqual(self.election.status, 'completed')

    def test_monitoring_endpoint_turnout_aggregation_and_zero_division(self):
        """
        Tests /monitoring/ endpoint:
        - Accurately computes turnout percentage
        - Safe at 0 voters (returns 0.0 without division by zero)
        - Excludes candidate-level data
        """
        self.client.force_authenticate(user=self.creator)

        # 0 voters -> participation_rate is 0.0
        res_zero = self.client.get(f'/api/elections/{self.election.id}/monitoring/')
        self.assertEqual(res_zero.status_code, status.HTTP_200_OK)
        self.assertEqual(res_zero.data['total_eligible_voters'], 0)
        self.assertEqual(res_zero.data['voters_participated'], 0)
        self.assertEqual(res_zero.data['participation_rate'], 0.0)
        self.assertNotIn('candidates', res_zero.data)
        self.assertNotIn('votes', res_zero.data)

        # Add 4 voters, 3 have voted
        v1 = EligibleVoter.objects.create(election=self.election, email="v1@test.com", has_voted=True)
        v2 = EligibleVoter.objects.create(election=self.election, email="v2@test.com", has_voted=True)
        v3 = EligibleVoter.objects.create(election=self.election, email="v3@test.com", has_voted=True)
        v4 = EligibleVoter.objects.create(election=self.election, email="v4@test.com", has_voted=False)

        res = self.client.get(f'/api/elections/{self.election.id}/monitoring/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_eligible_voters'], 4)
        self.assertEqual(res.data['voters_participated'], 3)
        self.assertEqual(res.data['participation_rate'], 75.0)

    def test_audit_logs_endpoint_and_filtering(self):
        """
        Tests /audit-logs/ endpoint:
        - Lists events in reverse chronological order
        - Filterable by action
        """
        self.client.force_authenticate(user=self.creator)

        # Election is scheduled by default in setUp, so voter/candidate additions are locked!
        # Set to 'configured' to allow additions, which will log events
        self.election.status = 'configured'
        self.election.save()

        # Add a voter and candidate to generate audit logs
        res_v = self.client.post(f'/api/elections/{self.election.id}/voters/', {'email': 'auditvoter@test.com'}, format='json')
        self.assertEqual(res_v.status_code, status.HTTP_201_CREATED)
        res_c = self.client.post(f'/api/elections/{self.election.id}/candidates/', {'full_name': 'Audit Candidate'}, format='json')
        self.assertEqual(res_c.status_code, status.HTTP_201_CREATED)

        res = self.client.get(f'/api/elections/{self.election.id}/audit-logs/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 2)

        # Filter by action 'voter_added'
        res_filtered = self.client.get(f'/api/elections/{self.election.id}/audit-logs/?action=voter_added')
        self.assertEqual(res_filtered.status_code, status.HTTP_200_OK)
        for item in res_filtered.data['results']:
            self.assertEqual(item['action'], 'voter_added')



