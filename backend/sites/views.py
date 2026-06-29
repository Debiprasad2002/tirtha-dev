import json
import os
import re
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from pillow_heif import register_heif_opener
register_heif_opener()

from .models import Site, Contributor, ContributionBatch, ContributionImage, SiteSubmissionRequest



def _allowed_origin(origin):
    if not origin:
        return None

    if settings.DEBUG:
        if re.match(r"^https?://(?:localhost|127(?:\.\d+){3}|\d{1,3}(?:\.\d+){3})(?::\d+)?$", origin):
            return origin

    allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    if origin in allowed_origins:
        return origin

    return None


def _cors_headers(response, origin):
    allowed_origin = _allowed_origin(origin)
    if not allowed_origin:
        return response

    response["Access-Control-Allow-Origin"] = allowed_origin
    response["Vary"] = "Origin"
    response["Access-Control-Allow-Credentials"] = "true"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken, X-Requested-With"
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def _json_error(message, status=400, **extra):
	payload = {"status": "error", "message": message}
	payload.update(extra)
	return JsonResponse(payload, status=status)


MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000


def _get_request_files(request):
	files = []
	for _, file_list in request.FILES.lists():
		files.extend(file_list)
	return files


def _validate_image_file(uploaded_file, allow_video=False):
	if uploaded_file is None:
		raise ValidationError("Image file is required.")

	if hasattr(uploaded_file, 'size') and uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
		if allow_video:
			raise ValidationError("Uploaded file must be 10 MB or smaller.")
		else:
			raise ValidationError("Image file must be 10 MB or smaller.")

	content_type = getattr(uploaded_file, "content_type", "") or ""
	_, extension = os.path.splitext((uploaded_file.name or "").lower())

	# Detect video file
	is_video = extension in {".mp4", ".mov"} or content_type in {"video/mp4", "video/quicktime"}

	if is_video:
		if not allow_video:
			raise ValidationError("Only image files can be uploaded.")
		if extension not in {".mp4", ".mov"}:
			raise ValidationError("Unsupported video file type.")
		if content_type not in {"video/mp4", "video/quicktime"}:
			raise ValidationError("Unsupported video MIME type.")
		return

	# Image validation path
	if not content_type.startswith("image/"):
		raise ValidationError("Only image files can be uploaded.")

	allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif", ".heics", ".heifs"}
	if extension not in allowed_extensions:
		raise ValidationError("Unsupported image file type.")

	try:
		from PIL import Image
	except Exception:
		return

	try:
		Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
		uploaded_file.seek(0)
		with Image.open(uploaded_file) as image:
			image.verify()
	except getattr(__import__('PIL').Image, 'DecompressionBombError', Exception):
		raise ValidationError("Image file is too large or contains too many pixels.")
	finally:
		try:
			uploaded_file.seek(0)
		except Exception:
			pass


def _convert_heic_to_jpeg(uploaded_file, quality=80, max_size_px=4096):
	from PIL import Image
	from django.core.files.uploadedfile import SimpleUploadedFile
	from io import BytesIO

	uploaded_file.seek(0)
	with Image.open(uploaded_file) as img:
		exif_data = img.info.get("exif")
		if img.mode != "RGB":
			img = img.convert("RGB")
		
		# Resize if it exceeds max_size_px
		width, height = img.size
		if max_size_px and (width > max_size_px or height > max_size_px):
			if width > height:
				new_width = max_size_px
				new_height = int(height * (max_size_px / width))
			else:
				new_height = max_size_px
				new_width = int(width * (max_size_px / height))
			img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

		out_buf = BytesIO()
		if exif_data:
			img.save(out_buf, format="JPEG", exif=exif_data, quality=quality)
		else:
			img.save(out_buf, format="JPEG", quality=quality)
		
		name_root, _ = os.path.splitext(uploaded_file.name)
		new_filename = f"{name_root}.jpg"
		content_type = "image/jpeg"
		
		new_file = SimpleUploadedFile(
			name=new_filename,
			content=out_buf.getvalue(),
			content_type=content_type
		)
		return new_file



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


@require_GET
def site_stats(request, site_id):
	try:
		site = Site.objects.get(pk=site_id)
	except Site.DoesNotExist:
		return JsonResponse({"status": "error", "message": "Site not found."}, status=404)

	total_images = ContributionImage.objects.filter(site=site).count()
	total_contributors = Contributor.objects.filter(contribution_batches__site=site).distinct().count()

	top_contributors_qs = (
		Contributor.objects.filter(contribution_batches__site=site)
		.annotate(
			uploads=Count(
				"contribution_batches__images",
				filter=Q(contribution_batches__site=site),
			),
		)
		.filter(uploads__gt=0)
		.order_by("-uploads", "name")[:3]
	)

	top_contributors = [
		{"id": str(contributor.id), "name": contributor.name, "uploads": contributor.uploads}
		for contributor in top_contributors_qs
	]

	return JsonResponse({
		"total_images": total_images,
		"total_contributors": total_contributors,
		"top_contributors": top_contributors,
	})


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def google_login(request):
	"""Expects JSON body with `token` (Google ID token).

	Verifies token with Google, creates Contributor if necessary,
	stores contributor identifier in session, and returns contributor
	status (approved / waiting / banned / invalid_token).
	"""

	origin = request.headers.get('Origin')
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
			"is_active": True,
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


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def google_logout(request):
	origin = request.headers.get('Origin')
	if request.method == 'OPTIONS':
		resp = HttpResponse(status=204)
		return _cors_headers(resp, origin)

	request.session.flush()
	resp = JsonResponse({"status": "success", "message": "Successfully signed out."})
	return _cors_headers(resp, origin)


@ensure_csrf_cookie
@require_http_methods(["GET", "OPTIONS"])
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
	else:
		status = "approved"
		message = "Signed in and approved."

	# Handle CORS preflight for GET as well
	origin = request.headers.get('Origin')
	if request.method == 'OPTIONS':
		resp = HttpResponse()
		return _cors_headers(resp, origin)

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


@require_http_methods(["POST", "OPTIONS"])
def site_submission_request(request):
	origin = request.headers.get('Origin')
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

	if image:
		_, extension = os.path.splitext((image.name or "").lower())
		if extension in {".heic", ".heif", ".heics", ".heifs"}:
			try:
				image = _convert_heic_to_jpeg(image)
			except Exception as exc:
				return _cors_headers(_json_error(f"Failed to process HEIC image: {str(exc)}", status=400), origin)

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


def _extract_and_validate_exif(uploaded_file):
	from PIL import Image
	from PIL.ExifTags import TAGS

	metadata = {
		"camera_make": None,
		"camera_model": None,
		"date_taken": None,
		"focal_length": None,
		"gps_latitude": None,
		"gps_longitude": None,
	}

	try:
		uploaded_file.seek(0)
		with Image.open(uploaded_file) as img:
			img.verify()
	except Exception as exc:
		raise ValidationError(f"Corrupted image file: {str(exc)}")

	try:
		uploaded_file.seek(0)
		with Image.open(uploaded_file) as img:
			exif = img.getexif()
			if exif:
				if 271 in exif:
					metadata["camera_make"] = str(exif[271]).strip()
				if 272 in exif:
					metadata["camera_model"] = str(exif[272]).strip()
				if 36867 in exif:
					metadata["date_taken"] = str(exif[36867]).strip()
				elif 306 in exif:
					metadata["date_taken"] = str(exif[306]).strip()
				if 37386 in exif:
					fl = exif[37386]
					if isinstance(fl, tuple) and len(fl) == 2:
						try:
							metadata["focal_length"] = f"{float(fl[0]) / float(fl[1]):.1f} mm"
						except Exception:
							metadata["focal_length"] = str(fl)
					else:
						try:
							metadata["focal_length"] = f"{float(fl):.1f} mm"
						except Exception:
							metadata["focal_length"] = str(fl)

				try:
					gps_ifd = exif.get_ifd(0x8825)
					if gps_ifd:
						lat_ref = gps_ifd.get(1)
						lat_val = gps_ifd.get(2)
						lon_ref = gps_ifd.get(3)
						lon_val = gps_ifd.get(4)

						if lat_ref and lat_val and lon_ref and lon_val:
							def _to_dec(val):
								try:
									d = float(val[0])
									m = float(val[1])
									s = float(val[2])
									return d + (m / 60.0) + (s / 3600.0)
								except Exception:
									return 0.0

							latitude = _to_dec(lat_val)
							if str(lat_ref).upper() != "N":
								latitude = -latitude

							longitude = _to_dec(lon_val)
							if str(lon_ref).upper() != "E":
								longitude = -longitude

							metadata["gps_latitude"] = latitude
							metadata["gps_longitude"] = longitude
				except Exception:
					pass
	except Exception as exc:
		raise ValidationError(f"Invalid metadata structures: {str(exc)}")
	finally:
		try:
			uploaded_file.seek(0)
		except Exception:
			pass

	return metadata


def upload_contributions(request):
	origin = request.headers.get('Origin')
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
		return _cors_headers(_json_error("Invalid site_id.", status=404), origin)

	uploaded_files = _get_request_files(request)
	if not uploaded_files:
		return _cors_headers(_json_error("At least one image file is required."), origin)

	for uploaded_file in uploaded_files:
		try:
			_validate_image_file(uploaded_file, allow_video=True)
		except ValidationError as exc:
			return _cors_headers(_json_error(str(exc), status=400), origin)

	metadata_json = request.POST.get("metadata_json")
	metadata_map = {}
	if metadata_json:
		try:
			metadata_list = json.loads(metadata_json)
			for item in metadata_list:
				metadata_map[item.get("name")] = item
		except Exception:
			pass

	try:
		with transaction.atomic():
			batch = ContributionBatch.objects.create(
				site=site,
				contributor=contributor,
				total_images=len(uploaded_files),
				status=ContributionBatch.Status.PROCESSING,
			)

			created_images = []
			allow_full_resolution_raw = request.POST.get("allow_full_resolution")
			allow_full_resolution = allow_full_resolution_raw == "true"

			for uploaded_file in uploaded_files:
				_, extension = os.path.splitext((uploaded_file.name or "").lower())
				content_type = getattr(uploaded_file, "content_type", "") or ""
				is_video = extension in {".mp4", ".mov"} or content_type in {"video/mp4", "video/quicktime"}

				if is_video:
					metadata = {
						"camera_make": None,
						"camera_model": None,
						"date_taken": None,
						"focal_length": None,
						"gps_latitude": None,
						"gps_longitude": None,
					}
					processed_file = uploaded_file
					file_type = "video"
				else:
					# Extract and validate EXIF metadata server-side
					metadata = _extract_and_validate_exif(uploaded_file)
					
					# Convert to JPEG if HEIC/HEIF
					processed_file = uploaded_file
					if extension in {".heic", ".heif", ".heics", ".heifs"}:
						if allow_full_resolution:
							processed_file = _convert_heic_to_jpeg(uploaded_file, quality=95, max_size_px=None)
						else:
							processed_file = _convert_heic_to_jpeg(uploaded_file, quality=80, max_size_px=4096)
					file_type = "image"

				meta = metadata_map.get(uploaded_file.name, {})
				is_compressed = meta.get("is_compressed", False)
				original_filename = meta.get("original_filename", uploaded_file.name)
				original_file_size = meta.get("original_file_size", uploaded_file.size)

				created_images.append(
					ContributionImage.objects.create(
						batch=batch,
						site=site,
						image=processed_file,
						file_type=file_type,
						camera_make=metadata["camera_make"],
						camera_model=metadata["camera_model"],
						date_taken=metadata["date_taken"],
						focal_length=metadata["focal_length"],
						gps_latitude=metadata["gps_latitude"],
						gps_longitude=metadata["gps_longitude"],
						is_compressed=is_compressed,
						original_filename=original_filename,
						original_file_size=original_file_size,
						uploaded_file_size=uploaded_file.size,
					)
				)

			batch.status = ContributionBatch.Status.COMPLETED
			batch.total_images = len(created_images)
			batch.save(update_fields=["status", "total_images"])
	except ValidationError as exc:
		return _cors_headers(_json_error(str(exc), status=400), origin)
	except Exception as exc:
		return _cors_headers(_json_error(f"Unable to store uploaded images: {str(exc)}", status=500), origin)

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
					"file_type": image.file_type,
					"metadata": {
						"camera_make": image.camera_make,
						"camera_model": image.camera_model,
						"date_taken": image.date_taken,
						"focal_length": image.focal_length,
						"gps_latitude": image.gps_latitude,
						"gps_longitude": image.gps_longitude,
						"is_compressed": image.is_compressed,
						"original_filename": image.original_filename,
						"original_file_size": image.original_file_size,
						"uploaded_file_size": image.uploaded_file_size,
					}
				}
				for image in created_images
			],
		},
		status=201,
	)

	return _cors_headers(response, origin)



@require_http_methods(["GET", "OPTIONS"])
def upload_check(request):
	origin = request.headers.get('Origin')
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
		return _cors_headers(_json_error("Invalid site_id.", status=404), origin)

	response = JsonResponse({"allow_upload": True, "message": "Ready to upload images."}, status=200)
	return _cors_headers(response, origin)


@require_GET
def platform_statistics(request):
	"""Return global platform statistics: total sites, contributors, images, and top 5 contributors."""
	total_sites = Site.objects.count()
	total_contributors = Contributor.objects.filter(is_active=True).count()
	total_images = ContributionImage.objects.count()

	top_contributors_qs = (
		Contributor.objects.filter(is_active=True)
		.annotate(
			uploads=Count("contribution_batches__images"),
		)
		.filter(uploads__gt=0)
		.order_by("-uploads", "name")[:5]
	)

	top_contributors = [
		{"id": str(contributor.id), "name": contributor.name, "uploads": contributor.uploads}
		for contributor in top_contributors_qs
	]

	return JsonResponse({
		"total_sites": total_sites,
		"total_contributors": total_contributors,
		"total_images": total_images,
		"top_contributors": top_contributors,
	})
