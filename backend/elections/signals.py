from django.db.models.signals import post_save
from django.dispatch import receiver
from elections.models import Election, ElectionVerificationConfig, ElectionRules

@receiver(post_save, sender=Election)
def create_default_election_configurations(sender, instance, created, **kwargs):
    """
    Module 10 Signal Receiver:
    Automatically provisions default ElectionVerificationConfig and ElectionRules
    upon Election creation, ensuring baseline security and visibility rules exist.
    """
    if created:
        ElectionVerificationConfig.objects.get_or_create(election=instance)
        ElectionRules.objects.get_or_create(election=instance)
