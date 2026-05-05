from django.conf import settings
import re


class DevCorsMiddleware:
    """Allow local frontend origins to call the API during development.

    This middleware is intentionally permissive for local development and
    accepts localhost, 127.0.0.1 and LAN IP addresses (e.g. 192.168.x.x).
    It only runs when `DEBUG` is True.
    """

    ORIGIN_RE = re.compile(r"^https?://(?:localhost|127(?:\.\d+){3}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if not settings.DEBUG:
            return response

        origin = request.headers.get('Origin')
        if origin and self.ORIGIN_RE.match(origin):
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

        return response
