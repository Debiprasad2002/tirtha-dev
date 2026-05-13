from django.urls import path

from .views import site_list, google_login, current_contributor

urlpatterns = [
    path("sites/", site_list, name="site-list"),
    path("auth/google-login/", google_login, name="google-login"),
    path("auth/current-contributor/", current_contributor, name="current-contributor"),
]
