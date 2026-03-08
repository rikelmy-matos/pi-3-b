from django.contrib import admin

from .models import InviteToken, User


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


@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    list_display = [
        "token",
        "note",
        "created_by",
        "created_at",
        "expires_at",
        "used",
        "used_by",
        "used_at",
    ]
    list_filter = ["used"]
    search_fields = ["note", "token"]
    readonly_fields = ["token", "created_at", "used", "used_by", "used_at"]

    def save_model(self, request, obj, form, change):
        if not change:  # new token being created
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
