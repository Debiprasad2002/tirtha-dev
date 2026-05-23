from django.contrib import admin
from django.utils.html import format_html
from .models import Site, Contributor, ContributionBatch, ContributionImage
from .models import SiteSubmissionRequest


@admin.action(description="Approve selected contributors")
def approve_contributors(modeladmin, request, queryset):
	# Save each contributor individually so model signals can detect the
	# pending -> approved transition and send the approval email once.
	for contributor in queryset:
		contributor.is_active = True
		contributor.is_banned = False
		contributor.save(update_fields=["is_active", "is_banned"])


@admin.action(description="Ban selected contributors")
def ban_contributors(modeladmin, request, queryset):
	# Save each contributor individually so model signals can detect the
	# pending -> banned transition and send the rejection email once.
	for contributor in queryset:
		contributor.is_banned = True
		contributor.is_active = False
		contributor.save(update_fields=["is_banned", "is_active"])


@admin.action(description="Deactivate selected contributors")
def deactivate_contributors(modeladmin, request, queryset):
	# Deactivate contributors (set to pending). Do not mark as banned.
	# We save individually so signals capture the previous state; no email
	# will be sent because this transition is into the pending state.
	for contributor in queryset:
		contributor.is_active = False
		contributor.is_banned = False
		contributor.save(update_fields=["is_active", "is_banned"])


class ContributorAdmin(admin.ModelAdmin):
	list_display = ("contributor_id", "name", "email", "is_active", "is_banned", "total_uploads", "created_at")
	list_filter = ("is_active", "is_banned")
	search_fields = ("name", "email")
	actions = [approve_contributors, ban_contributors, deactivate_contributors]
	readonly_fields = ("contributor_id", "total_uploads")


class ContributionImageInline(admin.TabularInline):
	model = ContributionImage
	extra = 0
	readonly_fields = ("site", "image", "uploaded_at")
	can_delete = False
	show_change_link = True


@admin.register(ContributionBatch)
class ContributionBatchAdmin(admin.ModelAdmin):
	list_display = ("batch_id", "contributor", "site", "status", "total_images", "created_at")
	list_filter = ("status", "site", "created_at")
	search_fields = ("contributor__name", "contributor__email", "site__name")
	readonly_fields = ("created_at",)
	inlines = [ContributionImageInline]


@admin.register(ContributionImage)
class ContributionImageAdmin(admin.ModelAdmin):
	list_display = ("image_id", "batch_id", "site_id", "thumbnail", "uploaded_at")
	list_filter = ("site", "uploaded_at")
	search_fields = ("batch__batch_id", "site__name", "batch__contributor__email")
	readonly_fields = ("uploaded_at", "image_id")

	def batch_id(self, obj):
		return getattr(obj.batch, "batch_id", obj.batch.pk)

	batch_id.short_description = "batch_id"

	def site_id(self, obj):
		return getattr(obj.site, "site_id", obj.site.pk)

	site_id.short_description = "site_id"

	def thumbnail(self, obj):
		try:
			if obj.image:
				return f"{obj.image.name.split('/')[-1]}"
		except Exception:
			return ""

	thumbnail.short_description = "image"


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
	list_display = ("site_id", "name", "latitude", "longitude", "state", "country", "total_images")
	search_fields = ("name", "site_id")
	readonly_fields = ("site_id", "created_at", "updated_at")
	fieldsets = (
		(None, {"fields": ("name", "latitude", "longitude")} ),
		("Details", {"fields": ("description", "details")} ),
		("Location", {"fields": ("state", "country")} ),
		("Stats", {"fields": ("total_images",)}),
	)


@admin.action(description="Approve selected site requests")
def approve_site_requests(modeladmin, request, queryset):
	queryset.update(status=SiteSubmissionRequest.Status.APPROVED)


@admin.action(description="Reject selected site requests")
def reject_site_requests(modeladmin, request, queryset):
	queryset.update(status=SiteSubmissionRequest.Status.REJECTED)


@admin.register(SiteSubmissionRequest)
class SiteSubmissionRequestAdmin(admin.ModelAdmin):
	list_display = ("request_id", "site_name", "name", "email", "status", "created_at", "image_preview")
	list_filter = ("status", "state", "country", "created_at")
	search_fields = ("request_id", "site_name", "name", "email", "google_maps_url")
	readonly_fields = ("request_id", "created_at", "image_preview")
	actions = [approve_site_requests, reject_site_requests]

	fieldsets = (
		(None, {"fields": ("request_id", "status", "created_at")} ),
		("User Details", {"fields": ("name", "email")} ),
		("Site Details", {"fields": ("site_name", "state", "country", "google_maps_url", "description")} ),
		("Location", {"fields": ("latitude", "longitude")} ),
		("Upload", {"fields": ("image", "image_preview")} ),
	)

	def image_preview(self, obj):
		if not obj.image:
			return "-"
		return format_html('<a href="{}" target="_blank"><img src="{}" style="max-height:120px;max-width:180px;border-radius:8px;object-fit:cover;" /></a>', obj.image.url, obj.image.url)

	image_preview.short_description = "Uploaded image"

admin.site.register(Contributor, ContributorAdmin)