from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status as drf_status

from projects.models import Project, ProjectMember
from .models import Task, KanbanColumn, Comment

User = get_user_model()


def make_user(username="tuser", password="testpass123"):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
        first_name=username.capitalize(),
    )


def make_project(owner, name="Test Project"):
    project = Project.objects.create(owner=owner, name=name)
    ProjectMember.objects.create(
        project=project, user=owner, role=ProjectMember.ROLE_OWNER
    )
    return project


def make_task(project, created_by, title="Test Task", status="todo"):
    return Task.objects.create(
        project=project,
        created_by=created_by,
        title=title,
        status=status,
    )


class TaskCRUDTest(APITestCase):
    def setUp(self):
        self.alice = make_user("talice")
        self.bob = make_user("tbob")
        self.project = make_project(self.alice)
        self.client.force_authenticate(user=self.alice)

    # ── Create ────────────────────────────────────────────────────────────────

    def test_create_task(self):
        res = self.client.post(
            "/api/v1/tasks/",
            {
                "project": str(self.project.id),
                "title": "Nova Tarefa",
                "priority": "medium",
            },
        )
        self.assertEqual(res.status_code, drf_status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Nova Tarefa")
        self.assertEqual(res.data["status"], "todo")

    def test_create_task_requires_project(self):
        res = self.client.post("/api/v1/tasks/", {"title": "Sem projeto"})
        self.assertEqual(res.status_code, drf_status.HTTP_400_BAD_REQUEST)

    def test_non_member_cannot_create_task(self):
        self.client.force_authenticate(user=self.bob)
        res = self.client.post(
            "/api/v1/tasks/",
            {
                "project": str(self.project.id),
                "title": "Hack",
                "priority": "low",
            },
        )
        self.assertEqual(res.status_code, drf_status.HTTP_403_FORBIDDEN)

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_tasks_for_project(self):
        make_task(self.project, self.alice, "T1")
        make_task(self.project, self.alice, "T2")
        res = self.client.get("/api/v1/tasks/", {"project": str(self.project.id)})
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_cannot_list_tasks_of_foreign_project(self):
        other_project = make_project(self.bob, "Bob Project")
        make_task(other_project, self.bob, "Secret")
        res = self.client.get("/api/v1/tasks/", {"project": str(other_project.id)})
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def test_retrieve_task(self):
        task = make_task(self.project, self.alice)
        res = self.client.get(f"/api/v1/tasks/{task.id}/")
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["title"], task.title)

    def test_retrieve_foreign_task_forbidden(self):
        other_project = make_project(self.bob)
        task = make_task(other_project, self.bob)
        res = self.client.get(f"/api/v1/tasks/{task.id}/")
        self.assertEqual(res.status_code, drf_status.HTTP_404_NOT_FOUND)

    # ── Update ────────────────────────────────────────────────────────────────

    def test_update_task_title(self):
        task = make_task(self.project, self.alice)
        res = self.client.patch(f"/api/v1/tasks/{task.id}/", {"title": "Renomeada"})
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Renomeada")

    def test_assign_task(self):
        ProjectMember.objects.create(
            project=self.project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        task = make_task(self.project, self.alice)
        res = self.client.patch(
            f"/api/v1/tasks/{task.id}/", {"assignee_id": self.bob.id}
        )
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["assignee"]["id"], self.bob.id)

    # ── Delete ────────────────────────────────────────────────────────────────

    def test_delete_task(self):
        task = make_task(self.project, self.alice)
        res = self.client.delete(f"/api/v1/tasks/{task.id}/")
        self.assertEqual(res.status_code, drf_status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    # ── Move (Kanban drag) ────────────────────────────────────────────────────

    def test_move_task(self):
        task = make_task(self.project, self.alice, status="todo")
        res = self.client.patch(
            f"/api/v1/tasks/{task.id}/move/",
            {
                "status": "in_progress",
                "position": 0,
            },
        )
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "in_progress")


class TaskCommentTest(APITestCase):
    def setUp(self):
        self.alice = make_user("talice2")
        self.project = make_project(self.alice)
        self.task = make_task(self.project, self.alice)
        self.client.force_authenticate(user=self.alice)

    def test_add_comment(self):
        res = self.client.post(
            f"/api/v1/tasks/{self.task.id}/comments/",
            {"body": "Ótimo progresso!"},
        )
        self.assertEqual(res.status_code, drf_status.HTTP_201_CREATED)
        self.assertEqual(res.data["body"], "Ótimo progresso!")

    def test_list_comments(self):
        Comment.objects.create(task=self.task, author=self.alice, body="Comentário 1")
        Comment.objects.create(task=self.task, author=self.alice, body="Comentário 2")
        res = self.client.get(f"/api/v1/tasks/{self.task.id}/comments/")
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_empty_comment_rejected(self):
        res = self.client.post(f"/api/v1/tasks/{self.task.id}/comments/", {"body": ""})
        self.assertEqual(res.status_code, drf_status.HTTP_400_BAD_REQUEST)


class KanbanColumnTest(APITestCase):
    def setUp(self):
        self.alice = make_user("talice3")
        self.project = make_project(self.alice)
        self.client.force_authenticate(user=self.alice)

    def test_create_column(self):
        res = self.client.post(
            "/api/v1/columns/",
            {
                "project": str(self.project.id),
                "name": "Em Revisão",
                "slug": "review",
                "color": "#9c27b0",
                "order": 3,
            },
        )
        self.assertEqual(res.status_code, drf_status.HTTP_201_CREATED)
        self.assertEqual(res.data["slug"], "review")

    def test_duplicate_slug_rejected(self):
        KanbanColumn.objects.create(
            project=self.project, name="To Do", slug="todo", order=0
        )
        res = self.client.post(
            "/api/v1/columns/",
            {
                "project": str(self.project.id),
                "name": "Another Todo",
                "slug": "todo",
                "order": 1,
            },
        )
        self.assertEqual(res.status_code, drf_status.HTTP_400_BAD_REQUEST)

    def test_list_columns_for_project(self):
        KanbanColumn.objects.create(
            project=self.project, name="Todo", slug="todo", order=0
        )
        KanbanColumn.objects.create(
            project=self.project, name="Done", slug="done", order=1
        )
        res = self.client.get("/api/v1/columns/", {"project": str(self.project.id)})
        self.assertEqual(res.status_code, drf_status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)
