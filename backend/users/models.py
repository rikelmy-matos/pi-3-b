import os
import uuid

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone

# SEC-14: allowed avatar extensions
_ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
# SEC-14: max avatar file size (2 MB)
_MAX_AVATAR_SIZE = 2 * 1024 * 1024


def _validate_avatar(file):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in _ALLOWED_AVATAR_EXTENSIONS:
        raise ValidationError(
            f"Extensão de arquivo não permitida: {ext}. "
            f"Permitido: {', '.join(sorted(_ALLOWED_AVATAR_EXTENSIONS))}"
        )
    if file.size > _MAX_AVATAR_SIZE:
        raise ValidationError(
            f"O arquivo de avatar não pode exceder {_MAX_AVATAR_SIZE // (1024 * 1024)} MB."
        )


class User(AbstractUser):
    """Extended user model with avatar and bio."""

    email = models.EmailField(unique=True)
    # QUAL-2: bio max_length to avoid unbounded text in simple profile
    bio = models.TextField(blank=True, default="", max_length=500)
    # SEC-14: avatar with file-type and size validators
    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
        validators=[_validate_avatar],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        ordering = ["first_name", "last_name"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    @property
    def full_name(self):
        return self.get_full_name() or self.username


class InviteToken(models.Model):
    """
    Single-use invite token that must be presented at registration.
    Admin creates tokens in /admin/; each token can only be used once.
    """

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invite_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Leave blank for a token that never expires.",
    )
    used = models.BooleanField(default=False)
    used_by = models.OneToOneField(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="used_invite_token",
    )
    used_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional note (e.g. who this invite is for).",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Invite Token"
        verbose_name_plural = "Invite Tokens"

    def __str__(self):
        status = "used" if self.used else "active"
        return f"{self.token} [{status}]"

    @property
    def is_valid(self):
        """True when the token has not been used and has not expired."""
        if self.used:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
