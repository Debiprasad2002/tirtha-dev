from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Site


@require_GET
def site_list(request):
	# Include any additional fields recently added to the Site model
	# so the frontend can consume them directly (e.g., details, description)
	# Include newly-added `description` field as well so frontend receives it
	sites = Site.objects.all().values('id', 'name', 'latitude', 'longitude', 'details', 'description')
	return JsonResponse(list(sites), safe=False)
