from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Project, ProjectMember
from .serializers import (
    ProjectSerializer,
    ProjectListSerializer,
    ProjectMemberSerializer,
)


class IsProjectMember(permissions.BasePermission):
    """Allow access only to project members."""

    def has_object_permission(self, request, view, obj):
        return obj.members.filter(user=request.user).exists()


class IsProjectOwnerOrAdmin(permissions.BasePermission):
    """Allow modifications only to project owner or admin members."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return obj.members.filter(user=request.user).exists()
        return obj.members.filter(
            user=request.user,
            role__in=[ProjectMember.ROLE_OWNER, ProjectMember.ROLE_ADMIN],
        ).exists()


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "due_date", "name"]

    def get_queryset(self):
        # Only return projects where the current user is a member
        return (
            Project.objects.filter(members__user=self.request.user)
            .select_related("owner")
            .prefetch_related("members__user")
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        project = self.get_object()
        # Only owner/admin can add members
        if not project.members.filter(
            user=request.user,
            role__in=[ProjectMember.ROLE_OWNER, ProjectMember.ROLE_ADMIN],
        ).exists():
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectMemberSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        if not project.members.filter(
            user=request.user,
            role__in=[ProjectMember.ROLE_OWNER, ProjectMember.ROLE_ADMIN],
        ).exists():
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        membership = project.members.filter(user_id=user_id).first()
        if not membership:
            return Response(
                {"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND
            )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
