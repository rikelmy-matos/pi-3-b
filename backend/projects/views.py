from django.db import IntegrityError
from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Project,
    ProjectMember,
    ProjectBudget,
    ProjectTechStack,
    ProjectObjective,
    ProjectRisk,
    ProjectMilestone,
)
from .serializers import (
    ProjectSerializer,
    ProjectListSerializer,
    ProjectMemberSerializer,
    ProjectBudgetSerializer,
    ProjectTechStackSerializer,
    ProjectObjectiveSerializer,
    ProjectRiskSerializer,
    ProjectMilestoneSerializer,
)
from tasks.serializers import TaskActivitySerializer


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


def _is_owner_or_admin(project, user):
    """QUAL-12: extracted helper — avoids copy-pasting the membership check."""
    return project.members.filter(
        user=user,
        role__in=[ProjectMember.ROLE_OWNER, ProjectMember.ROLE_ADMIN],
    ).exists()


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsProjectOwnerOrAdmin()]
        return [permissions.IsAuthenticated()]

    filterset_fields = ["status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "due_date", "name"]

    def get_queryset(self):
        qs = (
            Project.objects.filter(members__user=self.request.user)
            .select_related("owner")
            .distinct()
        )
        if self.action == "list":
            # PERF-6: list view — annotate counts, skip heavy sub-resources
            qs = qs.prefetch_related("members__user").annotate(
                task_count=Count("tasks", distinct=True),
                member_count=Count("members", distinct=True),
            )
        else:
            # PERF-6: detail view — fetch all sub-resources
            qs = qs.prefetch_related(
                "members__user",
                "budget",
                "tech_stack",
                "objectives",
                "risks",
                "milestones",
            ).annotate(task_count=Count("tasks", distinct=True))
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectSerializer

    # QUAL-13: removed no-op perform_create override

    # ── Members ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        project = self.get_object()
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectMemberSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            try:
                serializer.save(project=project)
            except IntegrityError:
                # SEC-19: duplicate member → 400 instead of 500
                return Response(
                    {"detail": "Este usuário já é membro do projeto."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True, methods=["patch"], url_path="members/(?P<user_id>[^/.]+)/update"
    )
    def update_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        membership = project.members.filter(user_id=user_id).first()
        if not membership:
            return Response(
                {"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectMemberSerializer(
            membership, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        if not _is_owner_or_admin(project, request.user):
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

    # ── Budget (upsert) ───────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "put", "patch"], url_path="budget")
    def budget(self, request, pk=None):
        project = self.get_object()

        if request.method == "GET":
            try:
                budget = project.budget
            except ProjectBudget.DoesNotExist:
                return Response({})
            return Response(ProjectBudgetSerializer(budget).data)

        # PUT / PATCH — upsert: SEC-18 — only owner/admin may mutate
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        try:
            budget = project.budget
            serializer = ProjectBudgetSerializer(
                budget,
                data=request.data,
                partial=(request.method == "PATCH"),
            )
        except ProjectBudget.DoesNotExist:
            serializer = ProjectBudgetSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Tech Stack ────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="tech-stack")
    def tech_stack(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            items = project.tech_stack.all()
            return Response(ProjectTechStackSerializer(items, many=True).data)

        # SEC-18: only owner/admin may add items
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectTechStackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"tech-stack/(?P<item_id>[^/.]+)",
    )
    def tech_stack_detail(self, request, pk=None, item_id=None):
        project = self.get_object()
        item = project.tech_stack.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # SEC-18: only owner/admin may mutate/delete
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ProjectTechStackSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Objectives ────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="objectives")
    def objectives(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            items = project.objectives.all()
            return Response(ProjectObjectiveSerializer(items, many=True).data)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectObjectiveSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"objectives/(?P<item_id>[^/.]+)",
    )
    def objective_detail(self, request, pk=None, item_id=None):
        project = self.get_object()
        item = project.objectives.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ProjectObjectiveSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Risks ─────────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="risks")
    def risks(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            items = project.risks.all()
            return Response(ProjectRiskSerializer(items, many=True).data)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectRiskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"risks/(?P<item_id>[^/.]+)",
    )
    def risk_detail(self, request, pk=None, item_id=None):
        project = self.get_object()
        item = project.risks.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ProjectRiskSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Milestones ────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="milestones")
    def milestones(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            items = project.milestones.all()
            return Response(ProjectMilestoneSerializer(items, many=True).data)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectMilestoneSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"milestones/(?P<item_id>[^/.]+)",
    )
    def milestone_detail(self, request, pk=None, item_id=None):
        project = self.get_object()
        item = project.milestones.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # SEC-18
        if not _is_owner_or_admin(project, request.user):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ProjectMilestoneSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Members overview ──────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="members-overview")
    def members_overview(self, request, pk=None):
        """Return each project member enriched with task stats and last activity."""
        from tasks.models import Task, TaskActivity
        from django.db.models import Count as DCount, Max

        project = self.get_object()

        # PERF-4: single query for all member task stats instead of N+1
        task_stats = (
            Task.objects.filter(project=project)
            .values("assignee_id", "status")
            .annotate(cnt=DCount("id"))
        )
        # Build: { user_id: { status: count } }
        stats_map: dict = {}
        for row in task_stats:
            uid = row["assignee_id"]
            if uid is None:
                continue
            stats_map.setdefault(uid, {})
            stats_map[uid][row["status"]] = row["cnt"]

        # PERF-4: last activity per user in one query
        last_acts = (
            TaskActivity.objects.filter(task__project=project)
            .values("actor_id")
            .annotate(last=Max("created_at"))
        )
        last_act_map = {row["actor_id"]: row["last"] for row in last_acts}

        # PERF-4: prefetch all tasks with titles for the tasks_by_status map
        all_tasks = (
            Task.objects.filter(project=project)
            .select_related("assignee")
            .values("id", "assignee_id", "status", "title", "priority")
        )
        tasks_by_user: dict = {}
        for t in all_tasks:
            uid = t["assignee_id"]
            if uid is None:
                continue
            tasks_by_user.setdefault(uid, {}).setdefault(t["status"], []).append(
                {"id": str(t["id"]), "title": t["title"], "priority": t["priority"]}
            )

        result = []
        for membership in project.members.select_related("user").order_by("joined_at"):
            user = membership.user
            uid = user.id
            status_counts = stats_map.get(uid, {})
            total = sum(status_counts.values())
            avatar_url = None
            if user.avatar:
                avatar_url = request.build_absolute_uri(user.avatar.url)

            result.append(
                {
                    "membership_id": membership.id,
                    "user": {
                        "id": uid,
                        "username": user.username,
                        "full_name": user.get_full_name() or user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "email": user.email,
                        "avatar_url": avatar_url,
                    },
                    "role": membership.role,
                    "specialty": membership.specialty,
                    "hourly_rate": str(membership.hourly_rate)
                    if membership.hourly_rate
                    else None,
                    "joined_at": membership.joined_at,
                    "total_tasks": total,
                    "tasks_by_status": tasks_by_user.get(uid, {}),
                    "status_counts": status_counts,
                    "last_activity": last_act_map.get(uid),
                }
            )

        return Response(result)

    # ── Activity ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        """Return the activity log for all tasks in this project."""
        from tasks.models import TaskActivity

        project = self.get_object()
        qs = (
            TaskActivity.objects.filter(task__project=project)
            .select_related("actor", "task")
            .order_by("-created_at")[:100]
        )
        serializer = TaskActivitySerializer(qs, many=True)
        return Response(serializer.data)
