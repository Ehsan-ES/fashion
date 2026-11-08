"""
عملیات موجودی. همه با قفل ردیف (select_for_update) انجام می‌شوند تا خرید هم‌زمان
از موجودی بیشتر ممکن نباشد. در مرحله ثبت سفارش از همین توابع استفاده می‌شود.
"""
from django.db import transaction

from .models import Inventory


class InsufficientStock(Exception):
    def __init__(self, variant_id, requested, available):
        super().__init__(f"Variant {variant_id}: requested {requested}, available {available}")
        self.variant_id, self.requested, self.available = variant_id, requested, available


def _lock(variant_id) -> Inventory:
    return Inventory.objects.select_for_update().get(variant_id=variant_id)


def reserve(variant_id, qty: int) -> None:
    if qty <= 0:
        raise ValueError("qty must be positive")
    with transaction.atomic():
        inv = _lock(variant_id)
        if inv.available < qty:
            raise InsufficientStock(variant_id, qty, inv.available)
        inv.reserved += qty
        inv.save(update_fields=["reserved", "updated_at"])


def release(variant_id, qty: int) -> None:
    """رزرو را آزاد می‌کند (لغو سفارش یا انقضای پرداخت)."""
    if qty <= 0:
        raise ValueError("qty must be positive")
    with transaction.atomic():
        inv = _lock(variant_id)
        inv.reserved = max(inv.reserved - qty, 0)
        inv.save(update_fields=["reserved", "updated_at"])


def commit(variant_id, qty: int) -> None:
    """بعد از پرداخت موفق: رزرو را قطعی و از موجودی کم می‌کند."""
    if qty <= 0:
        raise ValueError("qty must be positive")
    with transaction.atomic():
        inv = _lock(variant_id)
        if inv.reserved < qty or inv.quantity < qty:
            raise InsufficientStock(variant_id, qty, min(inv.reserved, inv.quantity))
        inv.reserved -= qty
        inv.quantity -= qty
        inv.save(update_fields=["reserved", "quantity", "updated_at"])
