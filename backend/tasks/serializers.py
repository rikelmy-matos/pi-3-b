from rest_framework import serializers
from .models import Task, Comment
from users.serializers import UserSerializer


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    created_by = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
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
        return obj.comments.count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list/kanban views (no comments body)."""

    assignee = UserSerializer(read_only=True)
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
            "due_date",
            "position",
            "comment_count",
            "created_at",
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()


class TaskMoveSerializer(serializers.Serializer):
    """Used for moving a task to a new status/position (Kanban drag & drop)."""

    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)
    position = serializers.IntegerField(min_value=0)
