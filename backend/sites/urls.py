from django.urls import path

from .views import (
    site_list,
    google_login,
    current_contributor,
    upload_contributions,
    upload_check,
    site_submission_request,
)

urlpatterns = [
    path("sites/", site_list, name="site-list"),
    path("auth/google-login/", google_login, name="google-login"),
    path("auth/current-contributor/", current_contributor, name="current-contributor"),
    path("contributions/upload/", upload_contributions, name="contribution-upload"),
    path("contributions/upload-check/", upload_check, name="contribution-upload-check"),
    path("site-requests/submit/", site_submission_request, name="site-submission-request"),
]
