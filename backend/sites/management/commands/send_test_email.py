import logging

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send a test email using current email settings. Usage: send_test_email recipient@example.com'

    def add_arguments(self, parser):
        parser.add_argument('recipient', nargs=1, help='Recipient email address to send test mail to')

    def handle(self, *args, **options):
        recipient = options['recipient'][0]
        subject = 'Tirtha SMTP test'
        body = 'This is a test email sent from the Tirtha backend to verify SMTP settings.'
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None)
        if not from_email:
            raise CommandError('No DEFAULT_FROM_EMAIL or EMAIL_HOST_USER configured in settings.')

        self.stdout.write(f'EMAIL_BACKEND={settings.EMAIL_BACKEND}')
        self.stdout.write(f'EMAIL_HOST={getattr(settings, "EMAIL_HOST", "")}')
        self.stdout.write(f'EMAIL_PORT={getattr(settings, "EMAIL_PORT", "")}')
        self.stdout.write(f'EMAIL_USE_TLS={getattr(settings, "EMAIL_USE_TLS", "")}')
        self.stdout.write(f'EMAIL_HOST_USER={getattr(settings, "EMAIL_HOST_USER", "")}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL={getattr(settings, "DEFAULT_FROM_EMAIL", "")}')

        logger.info(
            "Test email command using backend=%s host=%s port=%s tls=%s user=%s from=%s",
            settings.EMAIL_BACKEND,
            settings.EMAIL_HOST,
            settings.EMAIL_PORT,
            settings.EMAIL_USE_TLS,
            settings.EMAIL_HOST_USER,
            from_email,
        )

        try:
            sent = send_mail(subject, body, from_email, [recipient], fail_silently=False)
        except Exception as e:
            logger.exception("Test email failed for recipient %s", recipient)
            raise CommandError(f'Failed to send test email: {e}')

        if sent:
            self.stdout.write(self.style.SUCCESS(f'Test email sent to {recipient}'))
        else:
            raise CommandError('send_mail returned 0 (no messages sent)')
