import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from elections.models import Election
from voting.crypto import generate_election_key

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Election)
def provision_election_encryption_key(sender, instance, created, **kwargs):
    """
    Auto-provisions a per-election symmetric key encrypted at rest
    with VOTING_MASTER_KEY upon Election creation.
    """
    if created:
        try:
            generate_election_key(instance)
        except Exception as e:
            logger.error(f"Failed to auto-generate encryption key for election {instance.id}: {e}")
