import os
import uuid
from posixpath import join as posix_join

from django.core.validators import FileExtensionValidator
from django.db import models


def contribution_image_upload_to(instance, filename):
    _, extension = os.path.splitext(filename)
    filename_root = uuid.uuid4().hex
    site_id = str(getattr(instance.site, "site_id", None) or getattr(instance, "site_id", None) or instance.site.pk)
    batch_id = str(getattr(instance.batch, "batch_id", None) or getattr(instance, "batch_id", None) or instance.batch.pk)
    return posix_join("contributions", site_id, batch_id, f"{filename_root}{extension.lower()}")


def site_submission_request_upload_to(instance, filename):
    _, extension = os.path.splitext(filename)
    filename_root = uuid.uuid4().hex
    return posix_join("site_requests", f"{filename_root}{extension.lower()}")


class Site(models.Model):
    # keep existing primary key
    site_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True, null=True)
    details = models.TextField(blank=True, null=True)
    state = models.CharField(max_length=128, blank=True, null=True)
    country = models.CharField(max_length=128, blank=True, null=True)
    total_images = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Contributor(models.Model):
    """Represents a contributor who can upload images.

    Contributors are created automatically after successful Google
    authentication but must be approved (is_active=True) by an admin
    before they can perform uploads.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contributor_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    profile_picture = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    total_uploads = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}>"


class ContributionBatch(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    # keep existing relations
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="contribution_batches")
    contributor = models.ForeignKey(Contributor, on_delete=models.CASCADE, related_name="contribution_batches")
    batch_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    total_images = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Batch {self.batch_id} - {self.site} - {self.contributor}"


class ContributionImage(models.Model):
    batch = models.ForeignKey(ContributionBatch, on_delete=models.CASCADE, related_name="images")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="contribution_images")
    image_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    image = models.ImageField(
        upload_to=contribution_image_upload_to,
        max_length=500,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff"])],
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Image {self.image_id} in batch {getattr(self.batch, 'batch_id', self.batch.pk)}"


class SiteSubmissionRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    request_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    site_name = models.CharField(max_length=255)
    state = models.CharField(max_length=128)
    country = models.CharField(max_length=128)
    description = models.TextField(null=True, blank=True)
    google_maps_url = models.URLField(max_length=500, null=True, blank=True)
    # source_url = models.URLField(max_length=500)  # Already removed per previous instructions
    image = models.ImageField(upload_to=site_submission_request_upload_to, max_length=500, null=True, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.site_name} ({self.request_id})"
