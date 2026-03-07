from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, KanbanColumnViewSet

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")
router.register("columns", KanbanColumnViewSet, basename="column")

urlpatterns = [
    path("", include(router.urls)),
]
