from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from projects.models import ProjectMember
from .models import Task, Comment
from .serializers import (
    TaskSerializer,
    TaskListSerializer,
    TaskMoveSerializer,
    CommentSerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "assignee", "project"]
    search_fields = ["title", "description"]
    ordering_fields = ["position", "due_date", "created_at", "priority"]

    def get_queryset(self):
        # Only return tasks from projects where the current user is a member
        return (
            Task.objects.filter(project__members__user=self.request.user)
            .select_related("assignee", "created_by", "project")
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TaskListSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        """Move a task to a new status column and/or position (Kanban)."""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        if serializer.is_valid():
            task.status = serializer.validated_data["status"]
            task.position = serializer.validated_data["position"]
            task.save(update_fields=["status", "position", "updated_at"])
            return Response(TaskSerializer(task, context={"request": request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            comments = task.comments.select_related("author")
            serializer = CommentSerializer(
                comments, many=True, context={"request": request}
            )
            return Response(serializer.data)

        serializer = CommentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(task=task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
