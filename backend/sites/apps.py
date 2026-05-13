from django.apps import AppConfig


class SitesConfig(AppConfig):
    name = 'sites'

    def ready(self):
        # Import signal handlers so contributor status changes trigger email
        # notifications when the app starts.
        from . import signals  # noqa: F401
