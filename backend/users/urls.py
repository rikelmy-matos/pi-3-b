from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AdminInviteTokenDeleteView,
    AdminInviteTokenListCreateView,
    AdminUserListView,
    AdminUserSetStaffView,
    AvatarView,
    ChangePasswordView,
    CustomTokenObtainPairView,
    ProfileView,
    RegisterView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("avatar/", AvatarView.as_view(), name="avatar"),
    # Admin-only
    path("admin/users/", AdminUserListView.as_view(), name="admin_user_list"),
    path(
        "admin/users/<int:user_id>/set-staff/",
        AdminUserSetStaffView.as_view(),
        name="admin_user_set_staff",
    ),
    path(
        "admin/invite-tokens/",
        AdminInviteTokenListCreateView.as_view(),
        name="admin_invite_token_list",
    ),
    path(
        "admin/invite-tokens/<int:pk>/",
        AdminInviteTokenDeleteView.as_view(),
        name="admin_invite_token_delete",
    ),
]
