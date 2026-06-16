from django.urls import path

from .views import (
    site_list,
    site_stats,
    google_login,
    current_contributor,
    upload_contributions,
    upload_check,
    site_submission_request,
    platform_statistics,
)

urlpatterns = [
    path("sites/", site_list, name="site-list"),
    path("sites/<str:site_id>/stats/", site_stats, name="site-stats"),
    path("platform/statistics/", platform_statistics, name="platform-statistics"),
    path("auth/google-login/", google_login, name="google-login"),
    path("auth/current-contributor/", current_contributor, name="current-contributor"),
    path("contributions/upload/", upload_contributions, name="contribution-upload"),
    path("contributions/upload-check/", upload_check, name="contribution-upload-check"),
    path("site-requests/submit/", site_submission_request, name="site-submission-request"),
]
