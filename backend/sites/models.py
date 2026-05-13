import uuid
from django.db import models


class Site(models.Model):
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True, null=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Contributor(models.Model):
    """Represents a contributor who can upload images.

    Contributors are created automatically after successful Google
    authentication but must be approved (is_active=True) by an admin
    before they can perform uploads.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    profile_picture = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}>"
