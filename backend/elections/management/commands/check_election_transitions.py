import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from elections.models import Election
from elections.audit import log_election_action
from voting.tally import compute_election_tally

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Idempotently checks and handles ALL time-based election transitions in one pass: "
        "'scheduled' -> 'active' at start_datetime, "
        "'active' -> 'completed' at end_datetime with automatic tally computation, and "
        "scheduled-results auto-publish when now >= results_visible_at."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(f"[{now.isoformat()}] Running unified election transitions check...")

        started_count = 0
        completed_count = 0
        published_count = 0

        # =====================================================================
        # 1. Transition 'scheduled' -> 'active' when start_datetime <= now
        # =====================================================================
        scheduled_elections = Election.objects.filter(
            status='scheduled',
            start_datetime__lte=now
        )

        for election in scheduled_elections:
            with transaction.atomic():
                locked_election = Election.objects.select_for_update().filter(
                    id=election.id,
                    status='scheduled'
                ).first()

                if not locked_election:
                    continue

                old_status = locked_election.status
                locked_election.status = 'active'
                locked_election.is_locked = True
                if not locked_election.actual_start_at:
                    locked_election.actual_start_at = now
                locked_election.save()

                log_election_action(
                    election=locked_election,
                    action='auto_transitioned',
                    details={
                        'from_status': old_status,
                        'to_status': 'active',
                        'scheduled_start': locked_election.start_datetime.isoformat() if locked_election.start_datetime else None,
                        'actual_start_at': locked_election.actual_start_at.isoformat()
                    }
                )
                started_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Transitioned election {locked_election.id} ('{locked_election.title}') to 'active'.")
                )

        # =====================================================================
        # 2. Transition 'active' -> 'completed' when end_datetime <= now
        # =====================================================================
        active_elections = Election.objects.filter(
            status='active',
            end_datetime__lte=now
        )

        for election in active_elections:
            with transaction.atomic():
                locked_election = Election.objects.select_for_update().filter(
                    id=election.id,
                    status='active'
                ).first()

                if not locked_election:
                    continue

                old_status = locked_election.status
                locked_election.status = 'completed'
                locked_election.save()

                log_election_action(
                    election=locked_election,
                    action='auto_transitioned',
                    details={
                        'from_status': old_status,
                        'to_status': 'completed',
                        'scheduled_end': locked_election.end_datetime.isoformat() if locked_election.end_datetime else None,
                        'completed_at': now.isoformat()
                    }
                )
                completed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Transitioned election {locked_election.id} ('{locked_election.title}') to 'completed'.")
                )

            # Compute tally once status is completed
            try:
                tally_result = compute_election_tally(locked_election)
                if tally_result.get('integrity_verified'):
                    self.stdout.write(
                        self.style.SUCCESS(f"Tally verified for election {locked_election.id}. Ballots: {tally_result.get('total_ballots_cast')}")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"Tally integrity mismatch for election {locked_election.id}! Publication blocked.")
                    )
            except Exception as e:
                logger.error(f"Failed to compute tally for election {locked_election.id}: {e}")
                self.stdout.write(
                    self.style.ERROR(f"Error computing tally for election {locked_election.id}: {e}")
                )

        # =====================================================================
        # 3. Scheduled-results auto-publish when now >= results_visible_at
        # =====================================================================
        scheduled_publish_elections = Election.objects.filter(
            status='completed',
            rules__results_visibility='scheduled',
            rules__results_visible_at__lte=now,
            election_result__is_published=False,
            election_result__integrity_verified=True
        )

        for election in scheduled_publish_elections:
            with transaction.atomic():
                result = getattr(election, 'election_result', None)
                if result and result.integrity_verified and not result.is_published:
                    result.is_published = True
                    result.published_at = now
                    result.save()

                    log_election_action(
                        election=election,
                        action='results_published',
                        details={
                            'method': 'scheduled_auto_publish',
                            'results_visible_at': election.rules.results_visible_at.isoformat(),
                            'published_at': now.isoformat()
                        }
                    )
                    published_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Auto-published scheduled results for election {election.id} ('{election.title}').")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Transition check complete. Activated: {started_count}, Completed: {completed_count}, Published: {published_count}."
            )
        )
