from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models, transaction
from django.utils import timezone

from .validators import PHONE_REGEX

phone_validator = RegexValidator(PHONE_REGEX, "شماره موبایل معتبر نیست.")


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra):
        if not phone:
            raise ValueError("شماره موبایل الزامی است.")
        user = self.model(phone=phone, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if not password:
            raise ValueError("برای ادمین رمز عبور الزامی است.")
        return self.create_user(phone, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    phone = models.CharField("موبایل", max_length=11, unique=True, validators=[phone_validator])
    first_name = models.CharField("نام", max_length=100, blank=True)
    last_name = models.CharField("نام خانوادگی", max_length=100, blank=True)
    email = models.EmailField("ایمیل", blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    personalization_enabled = models.BooleanField("شخصی‌سازی فعال", default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    def __str__(self):
        return self.phone


class OTPRequest(models.Model):
    """هر ردیف یک کد یک‌بارمصرف. خود کد ذخیره نمی‌شود، فقط HMAC آن."""

    phone = models.CharField(max_length=11)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["phone", "created_at"])]

    def __str__(self):
        return f"{self.phone} @ {self.created_at:%Y-%m-%d %H:%M}"


class UserAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    title = models.CharField("عنوان", max_length=50)
    recipient_name = models.CharField("نام گیرنده", max_length=100)
    recipient_phone = models.CharField("موبایل گیرنده", max_length=11, validators=[phone_validator])
    province = models.CharField("استان", max_length=60)
    city = models.CharField("شهر", max_length=60)
    address_line = models.CharField("نشانی", max_length=300)
    postal_code = models.CharField("کد پستی", max_length=10)
    is_default = models.BooleanField("پیش‌فرض", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name = "آدرس"
        verbose_name_plural = "آدرس‌ها"

    def __str__(self):
        return f"{self.user_id} - {self.title}"

    def save(self, *args, **kwargs):
        # MariaDB از Unique Index شرطی پشتیبانی نمی‌کند؛ پس «یک پیش‌فرض» را اینجا تضمین می‌کنیم.
        with transaction.atomic():
            if self._state.adding and not UserAddress.objects.filter(user_id=self.user_id).exists():
                self.is_default = True
            super().save(*args, **kwargs)
            if self.is_default:
                UserAddress.objects.filter(user_id=self.user_id).exclude(pk=self.pk).update(is_default=False)
