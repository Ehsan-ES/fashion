import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        PAID = "paid", "پرداخت‌شده"
        CANCELLED = "cancelled", "لغوشده"

    order_number = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    recipient_name = models.CharField(max_length=100)
    recipient_phone = models.CharField(max_length=11)
    province = models.CharField(max_length=60)
    city = models.CharField(max_length=60)
    address_line = models.CharField(max_length=300)
    postal_code = models.CharField(max_length=10)
    subtotal = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(0)])
    product_discount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    coupon_code = models.CharField(max_length=32, blank=True)
    coupon_discount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self):
        return str(self.order_number)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=64)
    color_name = models.CharField(max_length=60)
    size_name = models.CharField(max_length=30)
    quantity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        validators=[MinValueValidator(0)],
    )
    line_total = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(1)])

    class Meta:
        verbose_name = "قلم سفارش"
        verbose_name_plural = "اقلام سفارش"

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"


class OrderPayment(models.Model):
    class Status(models.TextChoices):
        INITIATING = "initiating", "در حال ایجاد پرداخت"
        READY = "ready", "آماده پرداخت"
        UNKNOWN = "unknown", "وضعیت نامشخص"
        PAID = "paid", "پرداخت‌شده"
        PAID_UNFULFILLED = "paid_unfulfilled", "پرداخت‌شده، نیازمند بررسی"
        FAILED = "failed", "ناموفق"
        EXPIRED = "expired", "منقضی‌شده"

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    gateway = models.CharField(max_length=24, default="zarinpal")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.INITIATING)
    authority = models.CharField(max_length=64, unique=True, null=True, blank=True)
    amount_rial = models.PositiveBigIntegerField()
    ref_id = models.CharField(max_length=64, blank=True)
    gateway_code = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "تراکنش پرداخت"
        verbose_name_plural = "تراکنش‌های پرداخت"
        indexes = [models.Index(fields=["order", "status"])]

    def __str__(self):
        return f"{self.order.order_number} · {self.get_status_display()}"
