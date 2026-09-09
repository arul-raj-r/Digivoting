import logging
from django.db import transaction
from django.utils import timezone
from elections.models import Election, EligibleVoter, Candidate
from elections.audit import log_election_action
from voting.models import Ballot, ElectionResult, CandidateResult
from voting.crypto import decrypt_ballot_choice

logger = logging.getLogger(__name__)


def compute_election_tally(election: Election, force: bool = False) -> dict:
    """
    Computes election tally automatically when status becomes 'completed' (or on stop for audit).
    1. Decrypts all ballots in memory using the election encryption key.
    2. Aggregates vote counts per candidate.
    3. CRITICALLY verifies sum(vote_count) == EligibleVoter.filter(has_voted=True).count().
    4. On mismatch: logs 'tally_integrity_mismatch', marks integrity_verified=False, blocks publishing.
    5. On match: marks integrity_verified=True. If results_visibility == 'immediate' and election is completed,
       publishes immediately.
    """
    with transaction.atomic():
        result, created = ElectionResult.objects.select_for_update().get_or_create(election=election)

        # If already computed, verified, and not forced, return existing result
        if not created and result.integrity_verified and not force:
            return {
                "success": True,
                "integrity_verified": True,
                "is_published": result.is_published,
                "total_ballots_cast": result.total_ballots_cast
            }

        ballots = Ballot.objects.filter(election=election)
        candidates = Candidate.objects.filter(election=election)
        candidate_map = {str(c.id): c for c in candidates}
        candidate_counts = {str(c.id): 0 for c in candidates}

        decryption_errors = 0
        valid_ballots_count = 0

        for ballot in ballots:
            try:
                candidate_id = decrypt_ballot_choice(election, ballot.encrypted_choice)
                if candidate_id in candidate_counts:
                    candidate_counts[candidate_id] += 1
                else:
                    # Valid decrypt but candidate ID not found in current candidates
                    candidate_counts[candidate_id] = candidate_counts.get(candidate_id, 0) + 1
                valid_ballots_count += 1
            except Exception as e:
                logger.error(f"Error decrypting ballot {ballot.id} for election {election.id}: {e}")
                decryption_errors += 1

        total_ballots_cast = valid_ballots_count + decryption_errors
        has_voted_count = EligibleVoter.objects.filter(election=election, has_voted=True).count()
        sum_votes = sum(candidate_counts.values())

        # Integrity check: sum(vote_count) must strictly equal has_voted_count
        integrity_ok = (sum_votes == has_voted_count) and (decryption_errors == 0)

        if not integrity_ok:
            log_election_action(
                election=election,
                action='tally_integrity_mismatch',
                details={
                    'ballots_cast': total_ballots_cast,
                    'valid_ballots_decrypted': valid_ballots_count,
                    'has_voted_count': has_voted_count,
                    'sum_votes': sum_votes,
                    'decryption_errors': decryption_errors,
                    'reason': 'Sum of candidate votes does not match recorded has_voted voter count.'
                }
            )
            result.integrity_verified = False
            result.is_published = False
            result.total_ballots_cast = total_ballots_cast
            result.save()

            return {
                "success": False,
                "integrity_verified": False,
                "is_published": False,
                "error": "Tally integrity mismatch detected. Publication blocked.",
                "total_ballots_cast": total_ballots_cast,
                "has_voted_count": has_voted_count
            }

        # Successful integrity branch: flip integrity_verified to True
        result.integrity_verified = True
        result.total_ballots_cast = total_ballots_cast

        # Wipe old CandidateResult records (if recomputing) and recreate
        CandidateResult.objects.filter(election_result=result).delete()
        candidate_results = []
        for cand_id, count in candidate_counts.items():
            if cand_id in candidate_map:
                candidate_results.append(
                    CandidateResult(
                        election_result=result,
                        candidate=candidate_map[cand_id],
                        vote_count=count
                    )
                )
        if candidate_results:
            CandidateResult.objects.bulk_create(candidate_results)

        # Check auto-publish rules (only for completed elections, never cancelled)
        rules = getattr(election, 'rules', None)
        if election.status == 'completed' and rules and rules.results_visibility == 'immediate':
            result.is_published = True
            result.published_at = timezone.now()
            log_election_action(
                election=election,
                action='results_published',
                details={'method': 'immediate_auto_publish', 'published_at': str(result.published_at)}
            )

        result.save()

        return {
            "success": True,
            "integrity_verified": True,
            "is_published": result.is_published,
            "total_ballots_cast": total_ballots_cast
        }
