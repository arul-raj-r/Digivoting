import os
import secrets
import hashlib
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from elections.models import Election, EligibleVoter, Candidate, ElectionRules, ElectionVerificationConfig, ElectionAuditLog
from voting.models import Ballot, ElectionEncryptionKey, ElectionResult, CandidateResult, BallotConfirmationToken
from voting.crypto import generate_election_key, encrypt_ballot_choice, decrypt_ballot_choice
from voting.tally import compute_election_tally

User = get_user_model()


class VotingDashboardVerificationTests(TestCase):
    """
    Comprehensive test suite validating the non-negotiables:
    - Ownership checks & 403 enforcement
    - created_by non-null guarantees
    - Locking checks: 'core' vs 'schedule'
    - Ballot table schema inspection (zero voter FK)
    - Tally integrity verification & mismatch blocking
    - Re-validation of results_visible_at > end_datetime
    - Webcam / Biometric hard blocks
    - Small electorate disclaimer with real numbers
    - Zero candidate data leaked in audit logs or submit response
    """

    def setUp(self):
        # Set test encryption master key in environment
        os.environ['VOTING_MASTER_KEY'] = 'ZTMxYjA1NDk4NWExNGE3NjE2Y2RlYzg3MWQ2YjA0MzE1MzgyZDhhZjQ1N2IyMDI0M2IxZTc4Njc2NmVlMzhlZQ=='

        # Create test users
        self.creator = User.objects.create_user(
            username='creator',
            email='creator@digivote.gov.in',
            password='Password123!',
            role='ELECTION_CREATOR'
        )
        self.other_user = User.objects.create_user(
            username='other_creator',
            email='other@digivote.gov.in',
            password='Password123!',
            role='ELECTION_CREATOR'
        )
        self.voter_user = User.objects.create_user(
            username='voter1',
            email='voter1@digivote.gov.in',
            password='Password123!',
            role='VOTER'
        )
        self.voter2_user = User.objects.create_user(
            username='voter2',
            email='voter2@digivote.gov.in',
            password='Password123!',
            role='VOTER'
        )

        self.client = APIClient()

    def test_created_by_is_never_null_and_forces_draft(self):
        """Election creation strictly forces status='draft' and created_by=request.user."""
        self.client.force_authenticate(user=self.creator)
        response = self.client.post('/api/elections/', {
            'title': 'General Council Election 2026',
            'description': 'Official voting for council representatives',
            'election_type': 'general',
            'status': 'active' # Attempt to override to active should be ignored
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        election_id = response.data['id']
        election = Election.objects.get(id=election_id)
        self.assertIsNotNone(election.created_by)
        self.assertEqual(election.created_by, self.creator)
        self.assertEqual(election.status, 'draft')
        self.assertFalse(election.is_locked)

    def test_non_owner_gets_403_on_mutations(self):
        """Non-creator receives 403 Forbidden on election edits, deletions, and publish."""
        election = Election.objects.create(
            title='Owner Exclusive Election',
            election_type='general',
            status='draft',
            created_by=self.creator
        )

        # Authenticate as a different user
        self.client.force_authenticate(user=self.other_user)

        # Non-owner patch
        res = self.client.patch(f'/api/elections/{election.id}/', {'title': 'Hacked Title'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Non-owner delete
        res = self.client.delete(f'/api/elections/{election.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Non-owner publish
        election.status = 'completed'
        election.save()
        res = self.client.post(f'/api/elections/{election.id}/results/publish/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Non-owner participation report
        res = self.client.get(f'/api/elections/{election.id}/reports/participation/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_rescheduling_allowed_in_scheduled_but_core_edits_blocked(self):
        """
        Verify that is_editable correctly distinguishes 'schedule' vs 'core':
        Rescheduling dates succeeds in 'scheduled' status, but editing title/description/type fails with 400.
        """
        now = timezone.now()
        start = now + timedelta(days=1)
        end = now + timedelta(days=2)

        election = Election.objects.create(
            title='Rescheduling Test Election',
            election_type='general',
            status='draft',
            created_by=self.creator
        )
        Candidate.objects.create(election=election, full_name='Alice')
        EligibleVoter.objects.create(election=election, email='voter1@digivote.gov.in')

        # Move to configured, then scheduled
        election.status = 'scheduled'
        election.start_datetime = start
        election.end_datetime = end
        election.save()

        self.client.force_authenticate(user=self.creator)

        # 1. Attempting core edit (title) while scheduled must fail with 400
        res = self.client.patch(f'/api/elections/{election.id}/', {
            'title': 'New Disallowed Title'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Core details', res.data['error'])

        # 2. Rescheduling (changing start and end dates) must SUCCEED while scheduled
        new_start = now + timedelta(days=3)
        new_end = now + timedelta(days=5)
        res = self.client.patch(f'/api/elections/{election.id}/', {
            'start_datetime': new_start.isoformat(),
            'end_datetime': new_end.isoformat()
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        election.refresh_from_db()
        self.assertEqual(election.title, 'Rescheduling Test Election') # Unchanged
        self.assertEqual(election.start_datetime.date(), new_start.date())

        # 3. Once active, rescheduling is ALSO locked
        election.status = 'active'
        election.save()
        res = self.client.patch(f'/api/elections/{election.id}/', {
            'start_datetime': (now + timedelta(days=4)).isoformat()
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ballot_table_schema_has_zero_voter_fk(self):
        """Inspect Ballot model schema to prove zero voter-identifying fields exist."""
        field_names = [f.name for f in Ballot._meta.get_fields()]
        self.assertIn('id', field_names)
        self.assertIn('election', field_names)
        self.assertIn('encrypted_choice', field_names)
        self.assertIn('submitted_at', field_names)

        # Strictly assert absence of citizen linkage foreign keys or columns
        self.assertNotIn('user', field_names)
        self.assertNotIn('voter', field_names)
        self.assertNotIn('eligible_voter', field_names)
        self.assertNotIn('user_id', field_names)
        self.assertNotIn('voter_id', field_names)

    def test_results_visible_at_revalidated_at_scheduled_transition(self):
        """
        Verify that results_visible_at > end_datetime is enforced even when
        rules were saved before end_datetime existed.
        """
        election = Election.objects.create(
            title='Timing Validation Election',
            election_type='general',
            status='configured',
            created_by=self.creator
        )
        Candidate.objects.create(election=election, full_name='Alice')
        EligibleVoter.objects.create(election=election, email='voter1@digivote.gov.in')

        now = timezone.now()
        # Rules saved with results_visible_at set to tomorrow
        reveal_time = now + timedelta(days=1)
        rules = election.rules
        rules.results_visibility = 'scheduled'
        rules.results_visible_at = reveal_time
        rules.save()

        self.client.force_authenticate(user=self.creator)

        # Attempt to transition to 'scheduled' with end_datetime AFTER reveal_time (end in 3 days)
        # reveal_time (1 day) <= end_datetime (3 days) -> MUST FAIL
        res = self.client.patch(f'/api/elections/{election.id}/', {
            'status': 'scheduled',
            'start_datetime': (now + timedelta(hours=2)).isoformat(),
            'end_datetime': (now + timedelta(days=3)).isoformat()
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Scheduled results release time', str(res.data))

    def test_webcam_and_biometric_verification_actively_block_voting(self):
        """Elections with webcam or biometric requirement actively block voting with a clear error."""
        election = Election.objects.create(
            title='Biometric Verification Election',
            election_type='general',
            status='active',
            created_by=self.creator
        )
        Candidate.objects.create(election=election, full_name='Bob')
        EligibleVoter.objects.create(election=election, email=self.voter_user.email)

        # 1. Test Biometric block
        v_config = election.verification_config
        v_config.require_biometric_verification = True
        v_config.save()

        self.client.force_authenticate(user=self.voter_user)
        res = self.client.get(f'/api/elections/{election.id}/ballot/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Biometric verification is required', res.data['error'])

        # 2. Test Webcam block
        v_config.require_biometric_verification = False
        v_config.require_webcam_verification = True
        v_config.save()

        res = self.client.get(f'/api/elections/{election.id}/ballot/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Webcam identity verification is required', res.data['error'])

    def test_tally_integrity_verification_and_mismatch_blocking(self):
        """
        Verify sum(vote_count) == has_voted.count().
        Deliberately broken scenario blocks publishing and logs 'tally_integrity_mismatch'.
        """
        election = Election.objects.create(
            title='Tally Integrity Test Election',
            election_type='general',
            status='completed',
            created_by=self.creator
        )
        cand_a = Candidate.objects.create(election=election, full_name='Candidate A')
        cand_b = Candidate.objects.create(election=election, full_name='Candidate B')

        # 3 eligible voters, all 3 voted
        v1 = EligibleVoter.objects.create(election=election, email='v1@test.com', has_voted=True)
        v2 = EligibleVoter.objects.create(election=election, email='v2@test.com', has_voted=True)
        v3 = EligibleVoter.objects.create(election=election, email='v3@test.com', has_voted=True)

        # Cast 3 legitimate encrypted ballots (2 for A, 1 for B)
        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand_a.id)),
            submitted_at=timezone.now()
        )
        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand_a.id)),
            submitted_at=timezone.now()
        )
        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand_b.id)),
            submitted_at=timezone.now()
        )

        # 1. Valid Tally Run
        tally_result = compute_election_tally(election, force=True)
        self.assertTrue(tally_result['integrity_verified'])
        self.assertEqual(tally_result['total_ballots_cast'], 3)
        self.assertEqual(CandidateResult.objects.get(candidate=cand_a).vote_count, 2)
        self.assertEqual(CandidateResult.objects.get(candidate=cand_b).vote_count, 1)

        # 2. Injected Mismatch Scenario: inject an illegitimate extra ballot
        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand_a.id)),
            submitted_at=timezone.now()
        ) # Now 4 ballots, but only 3 voters have has_voted=True!

        mismatch_tally = compute_election_tally(election, force=True)
        self.assertFalse(mismatch_tally['integrity_verified'])
        self.assertIn('Tally integrity mismatch detected', mismatch_tally['error'])

        # Confirm audit log entry was created
        audit_log = ElectionAuditLog.objects.filter(election=election, action='tally_integrity_mismatch').first()
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.details['ballots_cast'], 4)
        self.assertEqual(audit_log.details['has_voted_count'], 3)

        # Confirm publish endpoint actively refuses to publish
        self.client.force_authenticate(user=self.creator)
        res = self.client.post(f'/api/elections/{election.id}/results/publish/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('integrity check failed', res.data['error'])

    def test_small_electorate_disclaimer_shows_real_numbers(self):
        """Small-electorate disclaimer shows real numbers with a warning, never hiding data."""
        election = Election.objects.create(
            title='Small Electorate Election',
            election_type='poll',
            status='completed',
            created_by=self.creator
        )
        cand = Candidate.objects.create(election=election, full_name='Candidate A')
        EligibleVoter.objects.create(election=election, email='v1@test.com', has_voted=True)
        EligibleVoter.objects.create(election=election, email='v2@test.com', has_voted=True)

        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand.id)),
            submitted_at=timezone.now()
        )
        Ballot.objects.create(
            election=election,
            encrypted_choice=encrypt_ballot_choice(election, str(cand.id)),
            submitted_at=timezone.now()
        )

        compute_election_tally(election)
        result = election.election_result
        result.is_published = True
        result.save()

        self.client.force_authenticate(user=self.creator)
        res = self.client.get(f'/api/elections/{election.id}/results/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['small_electorate_disclaimer'])
        self.assertEqual(res.data['total_ballots_cast'], 2)
        self.assertEqual(res.data['results'][0]['vote_count'], 2) # Real numbers intact!

    def test_no_candidate_choice_ever_logged_in_audit_or_submit_response(self):
        """Verifies no candidate choice appears in logs, audit trail, or ballot submit response."""
        election = Election.objects.create(
            title='Strict Secrecy Election',
            election_type='general',
            status='active',
            created_by=self.creator
        )
        candidate = Candidate.objects.create(election=election, full_name='Secret Candidate Alpha')
        voter = EligibleVoter.objects.create(election=election, email=self.voter_user.email)

        self.client.force_authenticate(user=self.voter_user)

        # 1. Confirm ballot
        confirm_res = self.client.post(f'/api/elections/{election.id}/ballot/confirm/', {
            'candidate_id': str(candidate.id)
        })
        token = confirm_res.data['confirmation_token']

        # 2. Submit ballot
        submit_res = self.client.post(f'/api/elections/{election.id}/ballot/submit/', {
            'candidate_id': str(candidate.id),
            'confirmation_token': token
        })
        self.assertEqual(submit_res.status_code, status.HTTP_201_CREATED)

        # Response must NOT contain candidate name or ID
        self.assertNotIn('Secret Candidate Alpha', str(submit_res.data))
        self.assertNotIn(str(candidate.id), str(submit_res.data))
        self.assertIn('ballot_id', submit_res.data)

        # Inspect all audit log entries for this election
        audit_entries = ElectionAuditLog.objects.filter(election=election)
        for entry in audit_entries:
            details_str = str(entry.details)
            self.assertNotIn('Secret Candidate Alpha', details_str)
            self.assertNotIn(str(candidate.id), details_str)


class ConcurrentDoubleSubmitTransactionTest(TransactionTestCase):
    """
    Load-bearing atomic concurrency test:
    Simulates 5 concurrent threads attempting to submit a ballot with the same voter credentials.
    Expected outcome:
    - Exactly 1 submission succeeds (HTTP 201).
    - Exactly 4 submissions are rejected (HTTP 409 Conflict or 400 token used).
    - Exactly 1 Ballot is created in the database.
    - EligibleVoter.has_voted flips to True exactly once.
    """

    def setUp(self):
        os.environ['VOTING_MASTER_KEY'] = 'ZTMxYjA1NDk4NWExNGE3NjE2Y2RlYzg3MWQ2YjA0MzE1MzgyZDhhZjQ1N2IyMDI0M2IxZTc4Njc2NmVlMzhlZQ=='

        self.creator = User.objects.create_user(
            username='creator_concurrent',
            email='creator_conc@digivote.gov.in',
            password='Password123!',
            role='ELECTION_CREATOR'
        )
        self.voter = User.objects.create_user(
            username='voter_concurrent',
            email='voter_conc@digivote.gov.in',
            password='Password123!',
            role='VOTER'
        )
        self.election = Election.objects.create(
            title='Concurrent Voting Test Election',
            election_type='general',
            status='active',
            created_by=self.creator
        )
        self.candidate = Candidate.objects.create(
            election=self.election,
            full_name='Concurrent Candidate'
        )
        self.eligible_voter = EligibleVoter.objects.create(
            election=self.election,
            email=self.voter.email,
            has_voted=False
        )

    def test_concurrent_double_submit_5_threads(self):
        # 1. Issue a valid confirmation token
        client = APIClient()
        client.force_authenticate(user=self.voter)
        confirm_res = client.post(f'/api/elections/{self.election.id}/ballot/confirm/', {
            'candidate_id': str(self.candidate.id)
        })
        self.assertEqual(confirm_res.status_code, 200)
        token = confirm_res.data['confirmation_token']

        # Worker function executed by concurrent threads
        def submit_vote(worker_id):
            thread_client = APIClient()
            thread_client.force_authenticate(user=self.voter)
            response = thread_client.post(f'/api/elections/{self.election.id}/ballot/submit/', {
                'candidate_id': str(self.candidate.id),
                'confirmation_token': token
            })
            return response.status_code

        # Launch 5 concurrent threads
        num_threads = 5
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(submit_vote, i) for i in range(num_threads)]
            results = [f.result() for f in futures]

        # Analyze status codes across the 5 concurrent attempts
        success_count = results.count(status.HTTP_201_CREATED)
        conflict_or_bad_token_count = results.count(status.HTTP_409_CONFLICT) + results.count(status.HTTP_400_BAD_REQUEST)

        # Assertions
        self.assertEqual(success_count, 1, f"Expected exactly 1 successful submission, got {success_count}. All results: {results}")
        self.assertEqual(conflict_or_bad_token_count, 4, f"Expected 4 rejected submissions, got {conflict_or_bad_token_count}. All results: {results}")

        # Database state assertions
        ballots_count = Ballot.objects.filter(election=self.election).count()
        self.assertEqual(ballots_count, 1, f"Expected exactly 1 Ballot in database, found {ballots_count}")

        self.eligible_voter.refresh_from_db()
        self.assertTrue(self.eligible_voter.has_voted, "EligibleVoter.has_voted must be True")
