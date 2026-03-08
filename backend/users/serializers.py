from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import InviteToken, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "bio",
            "avatar",
            "avatar_url",
            "created_at",
        ]
        # SEC-15: avatar_url is always read-only (computed). The avatar ImageField
        # itself enforces valid image files only — no need to make it read-only here.
        read_only_fields = ["id", "created_at", "full_name", "avatar_url"]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
            "invite_token",
        ]

    def validate_invite_token(self, value):
        try:
            token_obj = InviteToken.objects.get(token=value)
        except InviteToken.DoesNotExist:
            raise serializers.ValidationError("Token de convite inválido.")
        if not token_obj.is_valid:
            raise serializers.ValidationError(
                "Token de convite já utilizado ou expirado."
            )
        return token_obj  # pass the object forward so create() can consume it

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        # QUAL-3: run Django's AUTH_PASSWORD_VALIDATORS
        try:
            password_validation.validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        token_obj = validated_data.pop("invite_token")
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Mark token as consumed
        token_obj.used = True
        token_obj.used_by = user
        token_obj.used_at = timezone.now()
        token_obj.save(update_fields=["used", "used_by", "used_at"])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "As senhas não coincidem."}
            )
        # QUAL-4: run AUTH_PASSWORD_VALIDATORS on the new password
        try:
            password_validation.validate_password(
                attrs["new_password"], user=self.context["request"].user
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # QUAL-5: pass request context so avatar_url is built as an absolute URL
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data
