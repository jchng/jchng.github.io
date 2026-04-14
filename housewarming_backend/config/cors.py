from django.conf import settings
from django.http import HttpResponse


class LocalCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/") and request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin", "")
        if self._is_allowed_origin(origin):
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"

        return response

    def _is_allowed_origin(self, origin):
        return any(origin.startswith(prefix) for prefix in settings.CORS_ALLOWED_ORIGIN_PREFIXES)
