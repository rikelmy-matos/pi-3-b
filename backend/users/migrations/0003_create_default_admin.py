"""
Data migration: create a default superuser admin/admin if it does not already exist.
Credentials: username=admin, email=admin@localhost, password=admin, is_staff=True, is_superuser=True.
Change the password immediately after first login.
"""

from django.db import migrations


def create_default_admin(apps, schema_editor):
    User = apps.get_model("users", "User")
    if User.objects.filter(username="admin").exists():
        return
    # Use create_superuser equivalent: set fields manually so the hashed
    # password is correct even when called through the historical model.
    from django.contrib.auth.hashers import make_password

    User.objects.create(
        username="admin",
        email="admin@localhost",
        first_name="Admin",
        last_name="",
        password=make_password("admin"),
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_alter_user_avatar_alter_user_bio_invitetoken"),
    ]

    operations = [
        migrations.RunPython(create_default_admin, noop),
    ]
