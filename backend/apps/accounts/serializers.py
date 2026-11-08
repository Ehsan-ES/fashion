from rest_framework import serializers

from .models import User, UserAddress
from .validators import normalize_phone, to_ascii_digits


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        return normalize_phone(super().to_internal_value(data))


class OTPRequestSerializer(serializers.Serializer):
    phone = PhoneField()


class OTPVerifySerializer(serializers.Serializer):
    phone = PhoneField()
    code = serializers.CharField(max_length=10)

    def validate_code(self, value):
        value = to_ascii_digits(value).strip()
        if not value.isdigit():
            raise serializers.ValidationError("کد باید فقط عدد باشد.")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "email", "personalization_enabled", "date_joined"]
        read_only_fields = ["id", "phone", "date_joined"]


class UserAddressSerializer(serializers.ModelSerializer):
    recipient_phone = PhoneField()
    MAX_ADDRESSES = 10

    class Meta:
        model = UserAddress
        fields = ["id", "title", "recipient_name", "recipient_phone", "province", "city",
                  "address_line", "postal_code", "is_default", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_postal_code(self, value):
        value = to_ascii_digits(value).strip()
        if not (value.isdigit() and len(value) == 10):
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None and request.user.addresses.count() >= self.MAX_ADDRESSES:
            raise serializers.ValidationError(f"حداکثر {self.MAX_ADDRESSES} آدرس می‌توانید ثبت کنید.")
        # آدرس پیش‌فرض را نمی‌شود خاموش کرد؛ باید آدرس دیگری پیش‌فرض شود.
        if self.instance and self.instance.is_default and attrs.get("is_default") is False:
            attrs["is_default"] = True
        return attrs
