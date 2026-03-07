from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
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
    SEC-16: Return only users that share at least one project with the requester.
    This prevents enumerating every account in the system.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["email", "first_name", "last_name", "username"]

    def get_queryset(self):
        from projects.models import Project

        # IDs of all projects the current user is a member of
        my_project_ids = Project.objects.filter(
            members__user=self.request.user
        ).values_list("id", flat=True)
        # All users (except self) who are members of those same projects
        return (
            User.objects.filter(project_memberships__project_id__in=my_project_ids)
            .exclude(id=self.request.user.id)
            .distinct()
        )
