import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .emails import (
	send_contributor_approval_email,
	send_contributor_rejection_email,
	send_contributor_deactivation_email,
)
from .models import Contributor

logger = logging.getLogger(__name__)


def _is_pending(is_active, is_banned):
	return not is_active and not is_banned


@receiver(pre_save, sender=Contributor)
def capture_previous_contributor_state(sender, instance, **kwargs):
	"""Capture the prior contributor state before save.

	We use the previous database values so post_save can tell whether the
	admin just moved a contributor out of the pending state or simply edited
	unrelated fields like name or profile picture.
	"""
	if not instance.pk:
		instance._previous_is_active = None
		instance._previous_is_banned = None
		logger.info("Contributor pre_save: new contributor %s", instance.email)
		return

	previous = sender.objects.filter(pk=instance.pk).values('is_active', 'is_banned').first()
	if previous is None:
		instance._previous_is_active = None
		instance._previous_is_banned = None
		logger.info("Contributor pre_save: no previous row found for %s", instance.email)
	else:
		instance._previous_is_active = previous['is_active']
		instance._previous_is_banned = previous['is_banned']
		logger.info(
			"Contributor pre_save: %s previous_state active=%s banned=%s",
			instance.email,
			instance._previous_is_active,
			instance._previous_is_banned,
		)


@receiver(post_save, sender=Contributor)
def send_contributor_status_email(sender, instance, created, **kwargs):
	"""Send exactly one email when contributor status changes from pending.

	The admin workflow updates `is_active` for approval and `is_banned` for
	rejection. We only send mail when the record leaves the pending state, and
	we rely on the previous DB snapshot captured in pre_save to avoid duplicate
	emails on later unrelated edits.
	"""
	if created:
		logger.info("Contributor post_save: created=%s email=%s (no notification sent)", created, instance.email)
		return

	previous_is_active = getattr(instance, '_previous_is_active', None)
	previous_is_banned = getattr(instance, '_previous_is_banned', None)
	if previous_is_active is None or previous_is_banned is None:
		logger.info("Contributor post_save: missing previous state for %s (no notification sent)", instance.email)
		return

	was_pending = _is_pending(previous_is_active, previous_is_banned)
	is_pending = _is_pending(instance.is_active, instance.is_banned)
	logger.info(
		"Contributor post_save: %s previous_pending=%s current_pending=%s current_active=%s current_banned=%s",
		instance.email,
		was_pending,
		is_pending,
		instance.is_active,
		instance.is_banned,
	)

	# Case A: contributor left pending (pending -> approved/banned)
	if was_pending and not is_pending:
		# Rejection takes precedence if the admin marks the contributor banned.
		if instance.is_banned:
			logger.info("Contributor %s transitioned pending -> banned; sending rejection email", instance.email)
			send_contributor_rejection_email(instance)
		elif instance.is_active:
			logger.info("Contributor %s transitioned pending -> approved; sending approval email", instance.email)
			send_contributor_approval_email(instance)
		return

	# Case B: contributor moved into pending (approved -> pending) -> deactivation
	# We only send a deactivation email when the previous state was active
	# (approved) and the new state is pending (not active, not banned).
	if previous_is_active and previous_is_active is True and not instance.is_active and not instance.is_banned:
		logger.info("Contributor %s transitioned approved -> pending; sending deactivation email", instance.email)
		send_contributor_deactivation_email(instance)