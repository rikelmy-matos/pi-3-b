import uuid
from django.conf import settings
from django.db import models


class Project(models.Model):
    """A project belonging to a user/organization."""

    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_COMPLETED = "completed"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAUSED, "Paused"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        # QUAL-9: SET_NULL so deleting a user doesn't cascade-delete their projects
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_projects",
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    """Membership of a user in a project with a role."""

    ROLE_OWNER = "owner"
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"
    ROLE_VIEWER = "viewer"

    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
        (ROLE_VIEWER, "Viewer"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    specialty = models.CharField(max_length=100, blank=True, default="")
    hourly_rate = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self):
        return f"{self.user} in {self.project} as {self.role}"


class ProjectBudget(models.Model):
    """Budget information for a project (one per project)."""

    CURRENCY_BRL = "BRL"
    CURRENCY_USD = "USD"
    CURRENCY_EUR = "EUR"

    CURRENCY_CHOICES = [
        (CURRENCY_BRL, "BRL (R$)"),
        (CURRENCY_USD, "USD ($)"),
        (CURRENCY_EUR, "EUR (€)"),
    ]

    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="budget"
    )
    currency = models.CharField(
        max_length=3, choices=CURRENCY_CHOICES, default=CURRENCY_BRL
    )
    estimated_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    actual_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Budget for {self.project.name}"


class ProjectTechStack(models.Model):
    """A technology used in the project (language, framework, infra, etc.)."""

    CATEGORY_BACKEND = "backend"
    CATEGORY_FRONTEND = "frontend"
    CATEGORY_DATABASE = "database"
    CATEGORY_INFRA = "infra"
    CATEGORY_MOBILE = "mobile"
    CATEGORY_OTHER = "other"

    CATEGORY_CHOICES = [
        (CATEGORY_BACKEND, "Backend"),
        (CATEGORY_FRONTEND, "Frontend"),
        (CATEGORY_DATABASE, "Banco de Dados"),
        (CATEGORY_INFRA, "Infraestrutura"),
        (CATEGORY_MOBILE, "Mobile"),
        (CATEGORY_OTHER, "Outro"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="tech_stack"
    )
    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50, blank=True, default="")
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.category})"


class ProjectObjective(models.Model):
    """A goal or deliverable for the project."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="objectives"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    is_achieved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title


class ProjectRisk(models.Model):
    """A risk associated with the project."""

    PROBABILITY_LOW = "low"
    PROBABILITY_MEDIUM = "medium"
    PROBABILITY_HIGH = "high"

    PROBABILITY_CHOICES = [
        (PROBABILITY_LOW, "Baixa"),
        (PROBABILITY_MEDIUM, "Média"),
        (PROBABILITY_HIGH, "Alta"),
    ]

    IMPACT_LOW = "low"
    IMPACT_MEDIUM = "medium"
    IMPACT_HIGH = "high"

    IMPACT_CHOICES = [
        (IMPACT_LOW, "Baixo"),
        (IMPACT_MEDIUM, "Médio"),
        (IMPACT_HIGH, "Alto"),
    ]

    RISK_OPEN = "open"
    RISK_MITIGATED = "mitigated"
    RISK_CLOSED = "closed"

    STATUS_CHOICES = [
        (RISK_OPEN, "Aberto"),
        (RISK_MITIGATED, "Mitigado"),
        (RISK_CLOSED, "Fechado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="risks")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    probability = models.CharField(
        max_length=10, choices=PROBABILITY_CHOICES, default=PROBABILITY_MEDIUM
    )
    impact = models.CharField(
        max_length=10, choices=IMPACT_CHOICES, default=IMPACT_MEDIUM
    )
    mitigation = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=RISK_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectMilestone(models.Model):
    """A named phase or milestone for the project."""

    STATUS_PLANNED = "planned"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_DONE = "done"

    STATUS_CHOICES = [
        (STATUS_PLANNED, "Planejado"),
        (STATUS_IN_PROGRESS, "Em Andamento"),
        (STATUS_DONE, "Concluído"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="milestones"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    completion_pct = models.PositiveSmallIntegerField(default=0)  # 0–100
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_date", "created_at"]

    def __str__(self):
        return self.title
