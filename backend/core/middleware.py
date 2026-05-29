from django.conf import settings
from django.http import HttpResponse
import re


class CorsMiddleware:
    """Enforce CORS origin validation for the backend API.

    During development, local frontend origins are also accepted so the
    Vite dev server can access the API.
    """

    ORIGIN_RE = re.compile(
        r"^https?://(?:localhost|127(?:\.\d+){3}|\d{1,3}(?:\.\d+){3})(?::\d+)?$"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def _allowed_origin(self, origin):
        if not origin:
            return None

        if settings.DEBUG and self.ORIGIN_RE.match(origin):
            return origin

        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        if origin in allowed_origins:
            return origin

        return None

    def _apply_cors(self, response, origin):
        if not origin:
            return response

        response['Access-Control-Allow-Origin'] = origin
        response['Vary'] = 'Origin'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-CSRFToken, X-Requested-With'
        )
        return response

    def __call__(self, request):
        origin = request.headers.get('Origin')
        allowed_origin = self._allowed_origin(origin)

        if request.method == 'OPTIONS':
            resp = HttpResponse()
            return self._apply_cors(resp, allowed_origin)

        response = self.get_response(request)
        return self._apply_cors(response, allowed_origin)
