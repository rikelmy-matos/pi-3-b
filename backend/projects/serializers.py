from rest_framework import serializers
from .models import Project, ProjectMember
from users.serializers import UserSerializer


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=__import__("users.models", fromlist=["User"]).User.objects.all(),
        write_only=True,
    )

    class Meta:
        model = ProjectMember
        fields = ["id", "user", "user_id", "role", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "status",
            "owner",
            "members",
            "start_date",
            "due_date",
            "task_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def create(self, validated_data):
        user = self.context["request"].user
        project = Project.objects.create(owner=user, **validated_data)
        # Automatically add creator as owner member
        ProjectMember.objects.create(
            project=project, user=user, role=ProjectMember.ROLE_OWNER
        )
        return project


class ProjectListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""

    owner = UserSerializer(read_only=True)
    task_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "status",
            "owner",
            "start_date",
            "due_date",
            "task_count",
            "member_count",
            "created_at",
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_member_count(self, obj):
        return obj.members.count()
