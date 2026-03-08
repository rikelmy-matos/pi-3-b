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
