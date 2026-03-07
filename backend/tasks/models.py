import uuid
from django.conf import settings
from django.db import models
from projects.models import Project


class KanbanColumn(models.Model):
    """A column on a project's Kanban board (e.g. 'To Do', 'In Progress', 'Done')."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="columns"
    )
    name = models.CharField(max_length=100)
    # slug used as Task.status value — must be unique within a project
    slug = models.SlugField(max_length=60)
    color = models.CharField(max_length=20, default="#1976d2")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]
        unique_together = ("project", "slug")

    def __str__(self):
        return f"{self.project.name} / {self.name}"


class Task(models.Model):
    """A task within a project, displayed on a Kanban board."""

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_CRITICAL = "critical"

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_CRITICAL, "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    # Free-form: stores the KanbanColumn.slug for this project
    status = models.CharField(max_length=60, default="todo")
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_tasks",
    )
    due_date = models.DateField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "-created_at"]

    def __str__(self):
        return self.title


class TaskActivity(models.Model):
    """Immutable log of significant task events (moves, assignee changes)."""

    ACTION_MOVED = "moved"
    ACTION_ASSIGNED = "assigned"
    ACTION_UNASSIGNED = "unassigned"
    ACTION_CREATED = "created"

    ACTION_CHOICES = [
        (ACTION_MOVED, "Moved"),
        (ACTION_ASSIGNED, "Assigned"),
        (ACTION_UNASSIGNED, "Unassigned"),
        (ACTION_CREATED, "Created"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activity")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_activities",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    from_value = models.CharField(max_length=200, blank=True, default="")
    to_value = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor} {self.action} '{self.task}'"


class Comment(models.Model):
    """A comment on a task."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.task}"
