from django.contrib import admin
from .models import Site, Contributor


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
	list_display = ("name", "email", "is_active", "is_banned", "created_at")
	list_filter = ("is_active", "is_banned")
	search_fields = ("name", "email")
	actions = [approve_contributors, ban_contributors, deactivate_contributors]


admin.site.register(Site)
admin.site.register(Contributor, ContributorAdmin)