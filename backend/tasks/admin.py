from django.contrib import admin
from .models import Task, Comment


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "priority", "assignee", "due_date"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]
    inlines = [CommentInline]
