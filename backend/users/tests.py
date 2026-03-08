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
