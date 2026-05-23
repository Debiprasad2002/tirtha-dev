import json
import os
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Site, Contributor, ContributionBatch, ContributionImage, SiteSubmissionRequest


def _cors_headers(response, origin):
	response["Access-Control-Allow-Origin"] = origin
	response["Access-Control-Allow-Credentials"] = "true"
	response["Access-Control-Allow-Headers"] = "Content-Type"
	response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
	return response


def _json_error(message, status=400, **extra):
	payload = {"status": "error", "message": message}
	payload.update(extra)
	return JsonResponse(payload, status=status)


def _get_request_files(request):
	files = []
	for _, file_list in request.FILES.lists():
		files.extend(file_list)
	return files


def _validate_image_file(uploaded_file):
	content_type = getattr(uploaded_file, "content_type", "") or ""
	if not content_type.startswith("image/"):
		raise ValidationError("Only image files can be uploaded.")

	_, extension = os.path.splitext((uploaded_file.name or "").lower())
	allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
	if extension not in allowed_extensions:
		raise ValidationError("Unsupported image file type.")

	try:
		from PIL import Image
	except Exception:
		return

	try:
		uploaded_file.seek(0)
		with Image.open(uploaded_file) as image:
			image.verify()
	finally:
		try:
			uploaded_file.seek(0)
		except Exception:
			pass


def _is_valid_http_url(value):
	if not value:
		return False
	try:
		parsed = urlparse(value)
		return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
	except Exception:
		return False


def _get_current_contributor(request):
	email = request.session.get("contributor_email")
	if not email:
		return None, JsonResponse({"allow_upload": False, "message": "Authentication required."}, status=401)

	try:
		contributor = Contributor.objects.get(email=email)
	except Contributor.DoesNotExist:
		request.session.pop("contributor_email", None)
		return None, JsonResponse({"allow_upload": False, "message": "Authentication required."}, status=401)

	if contributor.is_banned:
		return None, JsonResponse({"allow_upload": False, "message": "Account banned. Contact admin.",}, status=403)
	if not contributor.is_active:
		return None, JsonResponse({"allow_upload": False, "message": "Contributor approval required.", "approval_required": True}, status=403)

	return contributor, None


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
@require_http_methods(["POST", "OPTIONS"])
def google_login(request):
	"""Expects JSON body with `token` (Google ID token).

	Verifies token with Google, creates Contributor if necessary,
	stores contributor identifier in session, and returns contributor
	status (approved / waiting / banned / invalid_token).
	"""

	origin = request.META.get('HTTP_ORIGIN') or '*'
	if request.method == 'OPTIONS':
		resp = HttpResponse(status=204)
		return _cors_headers(resp, origin)

	# Handle CORS preflight and set CORS headers for credentialed requests

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
	return _cors_headers(resp, origin)


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
	return _cors_headers(resp, origin)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def site_submission_request(request):
	origin = request.META.get("HTTP_ORIGIN") or "*"
	if request.method == "OPTIONS":
		return _cors_headers(HttpResponse(status=204), origin)

	name = (request.POST.get("name") or "").strip()
	email = (request.POST.get("email") or "").strip()
	site_name = (request.POST.get("site_name") or "").strip()
	state = (request.POST.get("state") or "").strip()
	country = (request.POST.get("country") or "").strip()
	description = (request.POST.get("description") or "").strip()
	google_maps_url = (request.POST.get("google_maps_url") or "").strip()
	latitude_raw = request.POST.get("latitude")
	longitude_raw = request.POST.get("longitude")
	image = request.FILES.get("image")
	terms_accepted = (request.POST.get("terms_accepted") or "").lower() in {"1", "true", "on", "yes"}
	privacy_accepted = (request.POST.get("privacy_accepted") or "").lower() in {"1", "true", "on", "yes"}

	if not all([name, email, site_name, state, country]):
		return _cors_headers(_json_error("All required fields must be provided."), origin)
	if not terms_accepted or not privacy_accepted:
		return _cors_headers(_json_error("Terms and Privacy Policy must be accepted."), origin)
	if google_maps_url and not _is_valid_http_url(google_maps_url):
		return _cors_headers(_json_error("google_maps_url must be a valid URL if provided."), origin)

	try:
		latitude = float(latitude_raw)
		longitude = float(longitude_raw)
	except (TypeError, ValueError):
		return _cors_headers(_json_error("Valid latitude and longitude are required."), origin)

	try:
		_validate_image_file(image)
	except ValidationError as exc:
		return _cors_headers(_json_error(str(exc), status=400), origin)

	request_obj = SiteSubmissionRequest.objects.create(
		name=name,
		email=email,
		site_name=site_name,
		state=state,
		country=country,
		description=description if description else None,
		google_maps_url=google_maps_url if google_maps_url else None,
		image=image,
		latitude=latitude,
		longitude=longitude,
	)

	response = JsonResponse(
		{
			"status": "success",
			"message": "Site request submitted successfully.",
			"request": {
				"request_id": str(request_obj.request_id),
				"site_name": request_obj.site_name,
				"status": request_obj.status,
				"created_at": request_obj.created_at.isoformat(),
			},
		},
		status=201,
	)
	return _cors_headers(response, origin)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def upload_contributions(request):
	origin = request.META.get("HTTP_ORIGIN") or "*"
	if request.method == "OPTIONS":
		return _cors_headers(HttpResponse(status=204), origin)

	contributor, auth_response = _get_current_contributor(request)
	if auth_response is not None:
		return _cors_headers(auth_response, origin)

	site_id = request.POST.get("site_id")
	if not site_id:
		return _cors_headers(_json_error("site_id is required."), origin)

	try:
		site = Site.objects.get(pk=site_id)
	except (Site.DoesNotExist, ValueError, TypeError):
		site = Site.objects.filter(name__iexact=site_id).first()
		if site is None:
			return _cors_headers(_json_error("Invalid site_id.", status=404), origin)

	uploaded_files = _get_request_files(request)
	if not uploaded_files:
		return _cors_headers(_json_error("At least one image file is required."), origin)

	for uploaded_file in uploaded_files:
		try:
			_validate_image_file(uploaded_file)
		except ValidationError as exc:
			return _cors_headers(_json_error(str(exc), status=400), origin)

	try:
		with transaction.atomic():
			batch = ContributionBatch.objects.create(
				site=site,
				contributor=contributor,
				total_images=len(uploaded_files),
				status=ContributionBatch.Status.PROCESSING,
			)

			created_images = []
			for uploaded_file in uploaded_files:
				created_images.append(
					ContributionImage.objects.create(
						batch=batch,
						site=site,
						image=uploaded_file,
					)
				)

			batch.status = ContributionBatch.Status.COMPLETED
			batch.total_images = len(created_images)
			batch.save(update_fields=["status", "total_images"])
	except Exception:
		return _cors_headers(_json_error("Unable to store uploaded images.", status=500), origin)

	response = JsonResponse(
		{
			"status": "success",
			"message": "Images uploaded successfully.",
			"batch": {
				"id": batch.id,
				"site_id": batch.site_id,
				"contributor_id": str(batch.contributor_id),
				"total_images": batch.total_images,
				"status": batch.status,
			},
			"images": [
				{
					"id": image.id,
					"site_id": image.site_id,
					"image": image.image.name,
					"uploaded_at": image.uploaded_at.isoformat(),
				}
				for image in created_images
			],
		},
		status=201,
	)
	return _cors_headers(response, origin)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def upload_check(request):
	origin = request.META.get("HTTP_ORIGIN") or "*"
	if request.method == "OPTIONS":
		return _cors_headers(HttpResponse(status=204), origin)

	contributor, auth_response = _get_current_contributor(request)
	if auth_response is not None:
		return _cors_headers(auth_response, origin)

	site_id = request.GET.get("site_id")
	if not site_id:
		return _cors_headers(_json_error("site_id is required."), origin)

	try:
		site = Site.objects.get(pk=site_id)
	except (Site.DoesNotExist, ValueError, TypeError):
		site = Site.objects.filter(name__iexact=site_id).first()
		if site is None:
			return _cors_headers(_json_error("Invalid site_id.", status=404), origin)

	response = JsonResponse({"allow_upload": True, "message": "Ready to upload images."}, status=200)
	return _cors_headers(response, origin)
