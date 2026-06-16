from django.contrib import admin
from django.utils.html import format_html
from .models import Mesh, Contributor, Contribution, Image, SiteSubmissionRequest


@admin.action(description="Activate selected contributors")
def activate_contributors(modeladmin, request, queryset):
    """Set active=True for selected contributors."""
    for contributor in queryset:
        contributor.active = True
        contributor.banned = False
        contributor.save()


@admin.action(description="Ban selected contributors")
def ban_contributors(modeladmin, request, queryset):
    """Set banned=True for selected contributors."""
    for contributor in queryset:
        contributor.banned = True
        contributor.active = False
        contributor.save()


@admin.action(description="Deactivate selected contributors")
def deactivate_contributors(modeladmin, request, queryset):
    """Set active=False for selected contributors."""
    for contributor in queryset:
        contributor.active = False
        contributor.banned = False
        contributor.save()


@admin.register(Contributor)
class ContributorAdmin(admin.ModelAdmin):
    list_display = ("ID", "name", "email", "active", "banned", "created_at", "updated_at")
    list_filter = ("active", "banned", "created_at")
    search_fields = ("name", "email")
    actions = [activate_contributors, ban_contributors, deactivate_contributors]
    readonly_fields = ("ID", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("ID", "name", "email")}),
        ("Status", {"fields": ("active", "banned", "ban_reason")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


class ImageInline(admin.TabularInline):
    model = Image
    extra = 0
    readonly_fields = ("ID", "created_at", "image")
    can_delete = True
    show_change_link = True
    fields = ("ID", "image", "label", "remark", "created_at")


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ("ID", "mesh", "contributor", "contributed_at", "processed", "processed_at")
    list_filter = ("processed", "contributed_at", "mesh")
    search_fields = ("ID", "mesh__name", "contributor__name", "contributor__email")
    readonly_fields = ("ID", "contributed_at")
    inlines = [ImageInline]
    fieldsets = (
        (None, {"fields": ("ID", "mesh", "contributor")}),
        ("Processing", {"fields": ("processed", "processed_at")}),
        ("Timestamp", {"fields": ("contributed_at",)}),
    )


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("ID", "contribution", "label", "created_at")
    list_filter = ("label", "created_at", "contribution__mesh")
    search_fields = ("ID", "contribution__mesh__name", "contribution__contributor__email", "label")
    readonly_fields = ("ID", "created_at", "image_preview")
    fieldsets = (
        (None, {"fields": ("ID", "contribution")}),
        ("Image", {"fields": ("image", "image_preview")}),
        ("Metadata", {"fields": ("label", "remark")}),
        ("Timestamp", {"fields": ("created_at",)}),
    )

    def image_preview(self, obj):
        if not obj.image:
            return "-"
        return format_html(
            '<img src="{}" style="max-height:200px;max-width:300px;border-radius:8px;object-fit:cover;" />',
            obj.image.url
        )
    image_preview.short_description = "Image Preview"


@admin.register(Mesh)
class MeshAdmin(admin.ModelAdmin):
    list_display = ("ID", "name", "country", "state", "district", "status", "completed", "hidden", "created_at")
    list_filter = ("status", "completed", "hidden", "country", "state", "district", "created_at")
    search_fields = ("ID", "name", "verbose_id", "country", "state", "district")
    readonly_fields = ("ID", "verbose_id", "created_at", "updated_at", "reconstructed_at")
    fieldsets = (
        (None, {"fields": ("ID", "name", "description")}),
        ("Location", {"fields": ("country", "state", "district")}),
        ("Images", {"fields": ("preview", "thumbnail")}),
        ("Reconstruction Settings", {
            "fields": (
                "verbose_id", "status", "completed", "hidden", "center_image",
                "rotaX", "rotaY", "rotaZ", "orientMesh", "minObsAng", "denoise"
            ),
            "classes": ("collapse",),
        }),
        ("Timestamps", {"fields": ("created_at", "updated_at", "reconstructed_at")}),
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
        (None, {"fields": ("request_id", "status", "created_at")}),
        ("User Details", {"fields": ("name", "email")}),
        ("Site Details", {"fields": ("site_name", "state", "country", "google_maps_url", "description")}),
        ("Location", {"fields": ("latitude", "longitude")}),
        ("Upload", {"fields": ("image", "image_preview")}),
    )

    def image_preview(self, obj):
        if not obj.image:
            return "-"
        return format_html(
            '<a href="{}" target="_blank"><img src="{}" style="max-height:120px;max-width:180px;border-radius:8px;object-fit:cover;" /></a>',
            obj.image.url,
            obj.image.url
        )
    image_preview.short_description = "Uploaded image"