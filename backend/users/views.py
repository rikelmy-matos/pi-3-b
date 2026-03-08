from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import InviteToken, User
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    InviteTokenSerializer,
    RegisterSerializer,
    UserSerializer,
)


class IsStaff(permissions.BasePermission):
    """Allow access only to staff (admin) users."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )


class RegisterView(generics.CreateAPIView):
    # QUAL-8: removed dead queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        # QUAL-7: 204 No Content — success with no body to return
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvatarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)  # removes file from disk
            user.avatar = None
            user.save(update_fields=["avatar"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserListView(generics.ListAPIView):
    """
    SEC-16: Search-gated user lookup for the "add member" flow.
    Requires a ?search= param of at least 2 characters so this endpoint
    cannot be used to enumerate all accounts in one request, but still
    allows discovering any user by name/email (needed to invite new members
    who share no projects yet).
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["email", "first_name", "last_name", "username"]

    def get_queryset(self):
        search = self.request.query_params.get("search", "").strip()
        if len(search) < 2:
            return User.objects.none()
        return User.objects.exclude(id=self.request.user.id)


# ── Admin-only views ──────────────────────────────────────────────────────────


class AdminUserListView(generics.ListAPIView):
    """Staff-only: list ALL users with is_staff flag."""

    serializer_class = UserSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return User.objects.all().order_by("first_name", "last_name")


class AdminUserSetStaffView(APIView):
    """Staff-only: promote or demote a user's staff status.
    Only a staff user can grant/revoke staff. A user cannot demote themselves.
    """

    permission_classes = [IsStaff]

    def patch(self, request, user_id):
        if request.user.id == user_id:
            return Response(
                {
                    "detail": "Você não pode alterar seu próprio status de administrador."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        target = get_object_or_404(User, id=user_id)
        is_staff = request.data.get("is_staff")
        if not isinstance(is_staff, bool):
            return Response(
                {"detail": "Campo 'is_staff' é obrigatório e deve ser booleano."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_staff = is_staff
        target.save(update_fields=["is_staff"])
        return Response(UserSerializer(target, context={"request": request}).data)


class AdminUserDeleteView(APIView):
    """Staff-only: delete a non-staff user account."""

    permission_classes = [IsStaff]

    def delete(self, request, user_id):
        if request.user.id == user_id:
            return Response(
                {"detail": "Você não pode excluir sua própria conta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target = get_object_or_404(User, id=user_id)
        if target.is_staff:
            return Response(
                {"detail": "Não é possível excluir um usuário staff."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminInviteTokenListCreateView(generics.ListCreateAPIView):
    """Staff-only: list all invite tokens and create new ones."""

    serializer_class = InviteTokenSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return InviteToken.objects.select_related("created_by", "used_by").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminInviteTokenDeleteView(generics.DestroyAPIView):
    """Staff-only: delete (revoke) an invite token."""

    serializer_class = InviteTokenSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return InviteToken.objects.all()
