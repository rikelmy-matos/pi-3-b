from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(request):
    """Lightweight liveness/readiness probe — no DB hit required."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # Health probe (used by Docker HEALTHCHECK and k8s probes)
    path("api/v1/health/", health_check, name="health_check"),
    # API v1
    path("api/v1/auth/", include("users.urls")),
    path("api/v1/", include("projects.urls")),
    path("api/v1/", include("tasks.urls")),
    # JWT token refresh — SEC-13: single canonical location (removed duplicate)
    path(
        "api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"
    ),
]


# SEC-10: OpenAPI docs only in DEBUG mode
if settings.DEBUG:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
    ]

# SEC-12: serve media files only in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
