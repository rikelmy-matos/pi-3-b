from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = [
        "email",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "created_at",
    ]
    search_fields = ["email", "username", "first_name", "last_name"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
