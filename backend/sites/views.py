import json
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse

from .models import Site, Contributor


@require_GET
def site_list(request):
	# Include any additional fields recently added to the Site model
	# so the frontend can consume them directly (e.g., details, description)
	sites = Site.objects.all().values(
		"id",
		"name",
		"latitude",
		"longitude",
		"details",
		"description",
	)
	return JsonResponse(list(sites), safe=False)


@csrf_exempt
@require_POST
def google_login(request):
	"""Expects JSON body with `token` (Google ID token).

	Verifies token with Google, creates Contributor if necessary,
	stores contributor identifier in session, and returns contributor
	status (approved / waiting / banned / invalid_token).
	"""

	# Handle CORS preflight and set CORS headers for credentialed requests
	origin = request.META.get('HTTP_ORIGIN') or '*'
	if request.method == 'OPTIONS':
		resp = HttpResponse()
		resp["Access-Control-Allow-Origin"] = origin
		resp["Access-Control-Allow-Methods"] = "POST, OPTIONS"
		resp["Access-Control-Allow-Headers"] = "Content-Type"
		resp["Access-Control-Allow-Credentials"] = "true"
		return resp

	try:
		data = json.loads(request.body.decode("utf-8")) if request.body else {}
	except Exception:
		return JsonResponse({"status": "error", "message": "Invalid JSON."}, status=400)

	token = data.get("token") or data.get("id_token")
	if not token:
		return JsonResponse({"status": "error", "message": "Token is required."}, status=400)

	# Verify config
	client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
	if not client_id:
		return JsonResponse({"status": "error", "message": "Server missing GOOGLE_OAUTH_CLIENT_ID setting."}, status=500)

	try:
		from google.auth.transport import requests as google_requests
		from google.oauth2 import id_token as google_id_token
	except Exception as e:
		return JsonResponse({"status": "error", "message": f"Server missing google auth libraries: {e}"}, status=500)

	try:
		idinfo = google_id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
	except Exception:
		return JsonResponse({"status": "invalid_token", "message": "Invalid Google token."}, status=400)

	email = idinfo.get("email")
	name = idinfo.get("name") or ""
	picture = idinfo.get("picture") or ""

	if not email:
		return JsonResponse({"status": "error", "message": "Google token did not contain email."}, status=400)

	contributor, created = Contributor.objects.get_or_create(
		email=email,
		defaults={
			"name": name,
			"profile_picture": picture,
			"is_active": False,
			"is_banned": False,
		},
	)

	# Update name/picture if changed
	updated = False
	if name and contributor.name != name:
		contributor.name = name
		updated = True
	if picture and contributor.profile_picture != picture:
		contributor.profile_picture = picture
		updated = True
	if updated:
		contributor.save()

	# Save minimal contributor info in session for later requests
	request.session["contributor_email"] = contributor.email
	# Keep session until browser close
	request.session.set_expiry(0)

	# Prepare response status
	if contributor.is_banned:
		status = "banned"
		message = "Account banned. Contact admin."
	elif not contributor.is_active:
		status = "waiting_approval"
		message = "Signed in — waiting for admin approval."
	else:
		status = "approved"
		message = "Signed in and approved."

	resp = JsonResponse(
		{
			"status": status,
			"message": message,
			"contributor": {
				"id": str(contributor.id),
				"name": contributor.name,
				"email": contributor.email,
				"profile_picture": contributor.profile_picture,
				"is_active": contributor.is_active,
				"is_banned": contributor.is_banned,
			},
		}
	)
	# Echo origin and allow credentials so browser accepts session cookie
	resp["Access-Control-Allow-Origin"] = origin
	resp["Access-Control-Allow-Credentials"] = "true"
	return resp


@require_GET
def current_contributor(request):
	"""Return the currently authenticated contributor (based on session)."""

	email = request.session.get("contributor_email")
	if not email:
		return JsonResponse({"status": "anonymous", "message": "No authenticated contributor."}, status=200)

	try:
		contributor = Contributor.objects.get(email=email)
	except Contributor.DoesNotExist:
		# Clear stale session
		request.session.pop("contributor_email", None)
		return JsonResponse({"status": "anonymous", "message": "No authenticated contributor."}, status=200)

	if contributor.is_banned:
		status = "banned"
		message = "Account banned. Contact admin."
	elif not contributor.is_active:
		status = "waiting_approval"
		message = "Signed in — waiting for admin approval."
	else:
		status = "approved"
		message = "Signed in and approved."

	# Handle CORS preflight for GET as well
	origin = request.META.get('HTTP_ORIGIN') or '*'
	if request.method == 'OPTIONS':
		resp = HttpResponse()
		resp["Access-Control-Allow-Origin"] = origin
		resp["Access-Control-Allow-Methods"] = "GET, OPTIONS"
		resp["Access-Control-Allow-Headers"] = "Content-Type"
		resp["Access-Control-Allow-Credentials"] = "true"
		return resp

	resp = JsonResponse(
		{
			"status": status,
			"message": message,
			"contributor": {
				"id": str(contributor.id),
				"name": contributor.name,
				"email": contributor.email,
				"profile_picture": contributor.profile_picture,
				"is_active": contributor.is_active,
				"is_banned": contributor.is_banned,
			},
		}
	)
	resp["Access-Control-Allow-Origin"] = origin
	resp["Access-Control-Allow-Credentials"] = "true"
	return resp
