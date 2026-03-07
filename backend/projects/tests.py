from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import (
    Project,
    ProjectMember,
    ProjectBudget,
    ProjectTechStack,
    ProjectObjective,
    ProjectRisk,
    ProjectMilestone,
)

User = get_user_model()


def make_user(username="alice", password="testpass123"):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
        first_name=username.capitalize(),
    )


def make_project(owner, name="Projeto Teste"):
    project = Project.objects.create(owner=owner, name=name)
    ProjectMember.objects.create(
        project=project, user=owner, role=ProjectMember.ROLE_OWNER
    )
    return project


class ProjectCRUDTest(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.client.force_authenticate(user=self.alice)

    # ── Create ────────────────────────────────────────────────────────────────

    def test_create_project(self):
        res = self.client.post("/api/v1/projects/", {"name": "Novo Projeto"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Novo Projeto")
        # Creator should be set as owner member automatically
        project = Project.objects.get(id=res.data["id"])
        self.assertTrue(
            project.members.filter(
                user=self.alice, role=ProjectMember.ROLE_OWNER
            ).exists()
        )

    def test_create_project_requires_name(self):
        res = self.client.post("/api/v1/projects/", {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_project_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post("/api/v1/projects/", {"name": "X"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_only_own_projects(self):
        make_project(self.alice, "Alice Project")
        make_project(self.bob, "Bob Project")
        res = self.client.get("/api/v1/projects/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [p["name"] for p in res.data["results"]]
        self.assertIn("Alice Project", names)
        self.assertNotIn("Bob Project", names)

    def test_list_includes_shared_project(self):
        project = make_project(self.bob, "Shared")
        ProjectMember.objects.create(
            project=project, user=self.alice, role=ProjectMember.ROLE_MEMBER
        )
        res = self.client.get("/api/v1/projects/")
        names = [p["name"] for p in res.data["results"]]
        self.assertIn("Shared", names)

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def test_retrieve_own_project(self):
        project = make_project(self.alice)
        res = self.client.get(f"/api/v1/projects/{project.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], project.name)

    def test_retrieve_foreign_project_forbidden(self):
        project = make_project(self.bob)
        res = self.client.get(f"/api/v1/projects/{project.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # ── Update ────────────────────────────────────────────────────────────────

    def test_update_project(self):
        project = make_project(self.alice)
        res = self.client.patch(
            f"/api/v1/projects/{project.id}/", {"name": "Renomeado"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Renomeado")

    def test_member_cannot_update_project(self):
        project = make_project(self.alice)
        ProjectMember.objects.create(
            project=project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        self.client.force_authenticate(user=self.bob)
        res = self.client.patch(f"/api/v1/projects/{project.id}/", {"name": "Hack"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ── Delete ────────────────────────────────────────────────────────────────

    def test_delete_project(self):
        project = make_project(self.alice)
        res = self.client.delete(f"/api/v1/projects/{project.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=project.id).exists())

    def test_non_owner_cannot_delete(self):
        project = make_project(self.alice)
        ProjectMember.objects.create(
            project=project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        self.client.force_authenticate(user=self.bob)
        res = self.client.delete(f"/api/v1/projects/{project.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class ProjectMemberTest(APITestCase):
    def setUp(self):
        self.alice = make_user("alice2")
        self.bob = make_user("bob2")
        self.carol = make_user("carol")
        self.project = make_project(self.alice)
        self.client.force_authenticate(user=self.alice)

    def test_add_member(self):
        res = self.client.post(
            f"/api/v1/projects/{self.project.id}/members/",
            {"user_id": self.bob.id, "role": "member"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.project.members.filter(user=self.bob).exists())

    def test_remove_member(self):
        ProjectMember.objects.create(
            project=self.project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        res = self.client.delete(
            f"/api/v1/projects/{self.project.id}/members/{self.bob.id}/"
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self.project.members.filter(user=self.bob).exists())

    def test_non_admin_cannot_add_member(self):
        ProjectMember.objects.create(
            project=self.project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        self.client.force_authenticate(user=self.bob)
        res = self.client.post(
            f"/api/v1/projects/{self.project.id}/members/",
            {"user_id": self.carol.id, "role": "member"},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_member_specialty(self):
        ProjectMember.objects.create(
            project=self.project, user=self.bob, role=ProjectMember.ROLE_MEMBER
        )
        res = self.client.patch(
            f"/api/v1/projects/{self.project.id}/members/{self.bob.id}/update/",
            {"specialty": "Backend Developer"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["specialty"], "Backend Developer")


class ProjectBudgetTest(APITestCase):
    def setUp(self):
        self.alice = make_user("alice3")
        self.project = make_project(self.alice)
        self.client.force_authenticate(user=self.alice)
        self.url = f"/api/v1/projects/{self.project.id}/budget/"

    def test_get_empty_budget(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_upsert_budget(self):
        res = self.client.put(
            self.url,
            {
                "currency": "BRL",
                "estimated_cost": "10000.00",
                "actual_cost": None,
                "notes": "",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["currency"], "BRL")
        self.assertEqual(res.data["estimated_cost"], "10000.00")

    def test_upsert_budget_twice_updates(self):
        self.client.put(
            self.url, {"currency": "BRL", "estimated_cost": "5000.00", "notes": ""}
        )
        res = self.client.put(
            self.url, {"currency": "USD", "estimated_cost": "1000.00", "notes": ""}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["currency"], "USD")
        self.assertEqual(ProjectBudget.objects.filter(project=self.project).count(), 1)


class ProjectSubResourceTest(APITestCase):
    """Tests for tech-stack, objectives, risks, milestones."""

    def setUp(self):
        self.alice = make_user("alice4")
        self.project = make_project(self.alice)
        self.client.force_authenticate(user=self.alice)

    # ── Tech Stack ────────────────────────────────────────────────────────────

    def test_add_and_list_tech(self):
        url = f"/api/v1/projects/{self.project.id}/tech-stack/"
        res = self.client.post(
            url,
            {"name": "Django", "category": "backend", "version": "5.0", "notes": ""},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        list_res = self.client.get(url)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]["name"], "Django")

    def test_update_tech(self):
        item = ProjectTechStack.objects.create(
            project=self.project, name="React", category="frontend"
        )
        res = self.client.patch(
            f"/api/v1/projects/{self.project.id}/tech-stack/{item.id}/",
            {"version": "18"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["version"], "18")

    def test_delete_tech(self):
        item = ProjectTechStack.objects.create(
            project=self.project, name="Vue", category="frontend"
        )
        res = self.client.delete(
            f"/api/v1/projects/{self.project.id}/tech-stack/{item.id}/"
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    # ── Objectives ────────────────────────────────────────────────────────────

    def test_add_and_toggle_objective(self):
        url = f"/api/v1/projects/{self.project.id}/objectives/"
        res = self.client.post(
            url, {"title": "Entregar MVP", "description": "", "is_achieved": False}
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        item_id = res.data["id"]
        res2 = self.client.patch(
            f"/api/v1/projects/{self.project.id}/objectives/{item_id}/",
            {"is_achieved": True},
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data["is_achieved"])

    # ── Risks ─────────────────────────────────────────────────────────────────

    def test_add_and_list_risk(self):
        url = f"/api/v1/projects/{self.project.id}/risks/"
        res = self.client.post(
            url,
            {
                "title": "Atraso na entrega",
                "description": "",
                "probability": "high",
                "impact": "medium",
                "mitigation": "",
                "status": "open",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        list_res = self.client.get(url)
        self.assertEqual(len(list_res.data), 1)

    def test_update_risk_status(self):
        item = ProjectRisk.objects.create(
            project=self.project,
            title="Risk",
            probability="low",
            impact="low",
            status="open",
        )
        res = self.client.patch(
            f"/api/v1/projects/{self.project.id}/risks/{item.id}/",
            {"status": "mitigated"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "mitigated")

    # ── Milestones ────────────────────────────────────────────────────────────

    def test_add_milestone(self):
        url = f"/api/v1/projects/{self.project.id}/milestones/"
        res = self.client.post(
            url,
            {
                "title": "Fase 1",
                "description": "",
                "due_date": "2026-06-01",
                "completion_pct": 0,
                "status": "planned",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Fase 1")

    def test_update_milestone_progress(self):
        item = ProjectMilestone.objects.create(
            project=self.project, title="M1", completion_pct=0
        )
        res = self.client.patch(
            f"/api/v1/projects/{self.project.id}/milestones/{item.id}/",
            {"completion_pct": 50, "status": "in_progress"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["completion_pct"], 50)
