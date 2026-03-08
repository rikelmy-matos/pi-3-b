from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import InviteToken, User


def _register_payload(**overrides):
    base = {
        "email": "newuser@example.com",
        "username": "newuser",
        "first_name": "New",
        "last_name": "User",
        "password": "StrongPass123!",
        "password_confirm": "StrongPass123!",
    }
    base.update(overrides)
    return base


def _make_staff(**kwargs):
    return User.objects.create_user(
        email=kwargs.get("email", "staffuser@example.com"),
        username=kwargs.get("username", "staffuser"),
        password="AdminPass123!",
        first_name="Staff",
        last_name="User",
        is_staff=True,
    )


def _make_regular(**kwargs):
    return User.objects.create_user(
        email=kwargs.get("email", "regular@example.com"),
        username=kwargs.get("username", "regular"),
        password="RegularPass123!",
        first_name="Regular",
        last_name="User",
    )


class InviteTokenModelTest(APITestCase):
    def test_is_valid_fresh_token(self):
        token = InviteToken.objects.create()
        self.assertTrue(token.is_valid)

    def test_is_valid_used_token(self):
        token = InviteToken.objects.create(used=True)
        self.assertFalse(token.is_valid)

    def test_is_valid_expired_token(self):
        past = timezone.now() - timezone.timedelta(hours=1)
        token = InviteToken.objects.create(expires_at=past)
        self.assertFalse(token.is_valid)

    def test_is_valid_future_expiry(self):
        future = timezone.now() + timezone.timedelta(days=7)
        token = InviteToken.objects.create(expires_at=future)
        self.assertTrue(token.is_valid)


class RegisterWithInviteTokenTest(APITestCase):
    url = reverse("register")

    def test_register_without_token_rejected(self):
        payload = _register_payload()
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_token", response.data)

    def test_register_with_invalid_token_rejected(self):
        payload = _register_payload(invite_token="00000000-0000-0000-0000-000000000000")
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_token", response.data)

    def test_register_with_used_token_rejected(self):
        token = InviteToken.objects.create(used=True)
        payload = _register_payload(invite_token=str(token.token))
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_token", response.data)

    def test_register_with_expired_token_rejected(self):
        past = timezone.now() - timezone.timedelta(hours=1)
        token = InviteToken.objects.create(expires_at=past)
        payload = _register_payload(invite_token=str(token.token))
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_token", response.data)

    def test_register_with_valid_token_succeeds(self):
        token = InviteToken.objects.create()
        payload = _register_payload(invite_token=str(token.token))
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("email", response.data)

    def test_token_consumed_after_registration(self):
        token = InviteToken.objects.create()
        payload = _register_payload(invite_token=str(token.token))
        self.client.post(self.url, payload)
        token.refresh_from_db()
        self.assertTrue(token.used)
        self.assertIsNotNone(token.used_by)
        self.assertIsNotNone(token.used_at)

    def test_token_cannot_be_reused(self):
        token = InviteToken.objects.create()
        payload = _register_payload(invite_token=str(token.token))
        self.client.post(self.url, payload)
        # second attempt with same token, different email
        payload2 = _register_payload(
            email="another@example.com",
            username="another",
            invite_token=str(token.token),
        )
        response = self.client.post(self.url, payload2)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_token", response.data)


class AdminUserListTest(APITestCase):
    url = reverse("admin_user_list")

    def setUp(self):
        self.staff = _make_staff()
        self.regular = _make_regular()

    def test_staff_can_list_all_users(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u["email"] for u in response.data["results"]]
        self.assertIn(self.staff.email, emails)
        self.assertIn(self.regular.email, emails)

    def test_regular_user_cannot_list_all_users(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_list_contains_is_staff_field(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        first = response.data["results"][0]
        self.assertIn("is_staff", first)


class AdminSetStaffTest(APITestCase):
    def setUp(self):
        self.staff = _make_staff()
        self.regular = _make_regular()
        self.url = reverse("admin_user_set_staff", args=[self.regular.id])

    def test_staff_can_promote_user(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(self.url, {"is_staff": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.regular.refresh_from_db()
        self.assertTrue(self.regular.is_staff)

    def test_staff_can_demote_user(self):
        self.regular.is_staff = True
        self.regular.save()
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(self.url, {"is_staff": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.regular.refresh_from_db()
        self.assertFalse(self.regular.is_staff)

    def test_staff_cannot_change_own_status(self):
        self.client.force_authenticate(user=self.staff)
        own_url = reverse("admin_user_set_staff", args=[self.staff.id])
        response = self.client.patch(own_url, {"is_staff": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_regular_user_cannot_set_staff(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.patch(self.url, {"is_staff": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminInviteTokenTest(APITestCase):
    url = reverse("admin_invite_token_list")

    def setUp(self):
        self.staff = _make_staff()
        self.regular = _make_regular()

    def test_staff_can_list_tokens(self):
        InviteToken.objects.create(created_by=self.staff, note="test")
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["note"], "test")

    def test_staff_can_create_token(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(self.url, {"note": "for João"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        obj = InviteToken.objects.get(token=response.data["token"])
        self.assertEqual(obj.created_by, self.staff)

    def test_staff_can_delete_token(self):
        token = InviteToken.objects.create(created_by=self.staff)
        delete_url = reverse("admin_invite_token_delete", args=[token.id])
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InviteToken.objects.filter(id=token.id).exists())

    def test_regular_cannot_list_tokens(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_cannot_create_token(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.post(self.url, {"note": "hack"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
