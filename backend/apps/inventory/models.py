from django.db import models


class Inventory(models.Model):
    variant = models.OneToOneField("catalog.ProductVariant", on_delete=models.CASCADE, related_name="inventory")
    quantity = models.PositiveIntegerField("موجودی انبار", default=0)
    reserved = models.PositiveIntegerField("رزرو شده", default=0)
    low_stock_threshold = models.PositiveIntegerField("آستانه کم‌موجودی", default=3)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "موجودی"
        verbose_name_plural = "موجودی‌ها"
        constraints = [
            models.CheckConstraint(condition=models.Q(reserved__lte=models.F("quantity")),
                                   name="inventory_reserved_lte_quantity"),
        ]

    def __str__(self):
        return f"{self.variant_id}: {self.available}"

    @property
    def available(self) -> int:
        return max(self.quantity - self.reserved, 0)

    @property
    def is_low(self) -> bool:
        return self.available <= self.low_stock_threshold
