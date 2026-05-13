from django.conf import settings
from django.core.mail import send_mail
import logging
import smtplib

logger = logging.getLogger(__name__)


def _from_email():
	"""Resolve the sender address from settings.

	Gmail SMTP uses the authenticated mailbox as the sender by default, but we
	fall back to DEFAULT_FROM_EMAIL if it is configured separately.
	"""
	return settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER


def build_contributor_approval_email(contributor):
	subject = 'Contributor Access Approved – Tirtha'
	body = (
		f"Hello {contributor.name},\n\n"
		"Your contributor account has been approved successfully.\n"
		"You can now upload images and contribute to Tirtha.\n\n"
		"Thank you for contributing to preserving heritage sites.\n\n"
		"– Team Tirtha"
	)
	return subject, body


def build_contributor_rejection_email(contributor):
	subject = 'Contributor Request Update – Tirtha'
	body = (
		f"Hello {contributor.name},\n\n"
		"Your contributor request was reviewed but could not be approved at this time.\n\n"
		"For more details, please contact the admin team.\n\n"
		"– Team Tirtha"
	)
	return subject, body


def send_contributor_approval_email(contributor):
	"""Send approval email, but do not raise on SMTP errors.

	We catch SMTP-related exceptions and log them so the admin UI does not
	crash if mail sending fails during development or configuration.
	Returns True on success, False on failure.
	"""
	subject, body = build_contributor_approval_email(contributor)
	logger.info("Sending contributor approval email to %s using backend %s", contributor.email, settings.EMAIL_BACKEND)
	try:
		send_mail(subject, body, _from_email(), [contributor.email], fail_silently=False)
		logger.info("Contributor approval email sent to %s", contributor.email)
		return True
	except smtplib.SMTPException:
		logger.exception("Failed to send contributor approval email to %s", contributor.email)
		return False
	except Exception:
		logger.exception("Unexpected error while sending approval email to %s", contributor.email)
		return False


def send_contributor_rejection_email(contributor):
	"""Send rejection email, but do not raise on SMTP errors.

	Returns True on success, False on failure.
	"""
	subject, body = build_contributor_rejection_email(contributor)
	logger.info("Sending contributor rejection email to %s using backend %s", contributor.email, settings.EMAIL_BACKEND)
	try:
		send_mail(subject, body, _from_email(), [contributor.email], fail_silently=False)
		logger.info("Contributor rejection email sent to %s", contributor.email)
		return True
	except smtplib.SMTPException:
		logger.exception("Failed to send contributor rejection email to %s", contributor.email)
		return False
	except Exception:
		logger.exception("Unexpected error while sending rejection email to %s", contributor.email)
		return False


def build_contributor_deactivation_email(contributor):
	subject = 'Contributor Access Deactivated – Tirtha'
	body = (
		f"Hello {contributor.name},\n\n"
		"Your contributor access to Tirtha has been temporarily deactivated by the admin team.\n\n"
		"As a result, you will currently not be able to upload images or contribute to heritage site datasets on the platform.\n\n"
		"If you believe this was done in error or would like more information, please contact the admin team.\n\n"
		"Thank you for your interest in contributing to preserving heritage sites.\n\n"
		"– Team Tirtha"
	)
	return subject, body


def send_contributor_deactivation_email(contributor):
	"""Send deactivation email, but do not raise on SMTP errors."""
	subject, body = build_contributor_deactivation_email(contributor)
	logger.info("Sending contributor deactivation email to %s using backend %s", contributor.email, settings.EMAIL_BACKEND)
	try:
		send_mail(subject, body, _from_email(), [contributor.email], fail_silently=False)
		logger.info("Contributor deactivation email sent to %s", contributor.email)
		return True
	except smtplib.SMTPException:
		logger.exception("Failed to send contributor deactivation email to %s", contributor.email)
		return False
	except Exception:
		logger.exception("Unexpected error while sending deactivation email to %s", contributor.email)
		return False