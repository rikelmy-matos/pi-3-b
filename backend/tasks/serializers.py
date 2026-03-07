from rest_framework import serializers
from .models import Task, Comment, KanbanColumn, TaskActivity
from users.serializers import UserSerializer


class KanbanColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanColumn
        fields = ["id", "project", "name", "slug", "color", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class TaskActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    task_title = serializers.SerializerMethodField()

    def get_task_title(self, obj):
        return obj.task.title if obj.task else None

    class Meta:
        model = TaskActivity
        fields = [
            "id",
            "task",
            "task_title",
            "actor",
            "action",
            "from_value",
            "to_value",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "task",
            "actor",
            "action",
            "from_value",
            "to_value",
            "created_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    created_by = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    # PERF-7: use annotation when available, fall back to count
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "assignee_id",
            "created_by",
            "due_date",
            "position",
            "comments",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_comment_count(self, obj):
        # Use pre-annotated value if available (avoids extra query)
        if hasattr(obj, "comment_count_annotation"):
            return obj.comment_count_annotation
        return obj.comments.count()

    def validate_assignee_id(self, value):
        """SEC-20: assignee must be a member of the task's project."""
        if value is None:
            return value
        project = self.initial_data.get("project") or (
            self.instance.project_id if self.instance else None
        )
        if project:
            from projects.models import ProjectMember

            if not ProjectMember.objects.filter(
                project_id=project, user_id=value
            ).exists():
                raise serializers.ValidationError(
                    "O responsável deve ser membro do projeto."
                )
        return value

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list/kanban views (no comments body)."""

    assignee = UserSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "due_date",
            "position",
            "comment_count",
            "created_at",
        ]

    def get_comment_count(self, obj):
        if hasattr(obj, "comment_count_annotation"):
            return obj.comment_count_annotation
        return obj.comments.count()

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None


class TaskMoveSerializer(serializers.Serializer):
    """Used for moving a task to a new status column and/or position (Kanban drag & drop)."""

    status = serializers.CharField(max_length=60)
    position = serializers.IntegerField(min_value=0)
