from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from projects.models import ProjectMember
from .models import Task, Comment, KanbanColumn, TaskActivity
from .serializers import (
    TaskSerializer,
    TaskListSerializer,
    TaskMoveSerializer,
    CommentSerializer,
    KanbanColumnSerializer,
    TaskActivitySerializer,
)


class KanbanColumnViewSet(viewsets.ModelViewSet):
    """CRUD for Kanban columns scoped to a project."""

    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return KanbanColumn.objects.filter(
            project__members__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        serializer.save()


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "assignee", "project"]
    search_fields = ["title", "description"]
    ordering_fields = ["position", "due_date", "created_at", "priority"]

    def get_queryset(self):
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
        task = serializer.save()
        TaskActivity.objects.create(
            task=task,
            actor=self.request.user,
            action=TaskActivity.ACTION_CREATED,
            from_value="",
            to_value=task.status,
        )

    def perform_update(self, serializer):
        old = self.get_object()
        old_assignee = str(old.assignee_id) if old.assignee_id else ""
        old_status = old.status

        task = serializer.save()

        # Log assignee change
        new_assignee = str(task.assignee_id) if task.assignee_id else ""
        if old_assignee != new_assignee:
            from_name = old.assignee.get_full_name() if old.assignee else ""
            to_name = task.assignee.get_full_name() if task.assignee else ""
            if new_assignee:
                TaskActivity.objects.create(
                    task=task,
                    actor=self.request.user,
                    action=TaskActivity.ACTION_ASSIGNED,
                    from_value=from_name,
                    to_value=to_name,
                )
            else:
                TaskActivity.objects.create(
                    task=task,
                    actor=self.request.user,
                    action=TaskActivity.ACTION_UNASSIGNED,
                    from_value=from_name,
                    to_value="",
                )

    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        """Move a task to a new status column and/or position (Kanban drag & drop)."""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_status = task.status
        new_status = serializer.validated_data["status"]
        new_position = serializer.validated_data["position"]

        task.status = new_status
        task.position = new_position
        task.save(update_fields=["status", "position", "updated_at"])

        # Log only if column actually changed
        if old_status != new_status:
            # Resolve human-readable column names if available
            cols = {
                c.slug: c.name
                for c in KanbanColumn.objects.filter(project=task.project)
            }
            from_name = cols.get(old_status, old_status)
            to_name = cols.get(new_status, new_status)
            TaskActivity.objects.create(
                task=task,
                actor=request.user,
                action=TaskActivity.ACTION_MOVED,
                from_value=from_name,
                to_value=to_name,
            )

        return Response(TaskSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        """Return the activity log for a single task."""
        task = self.get_object()
        qs = task.activity.select_related("actor").all()
        serializer = TaskActivitySerializer(qs, many=True)
        return Response(serializer.data)

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
