from django.urls import path

from .views import site_list

urlpatterns = [
    path('sites/', site_list, name='site-list'),
]
