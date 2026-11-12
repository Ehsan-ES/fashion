from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import Product
from apps.inventory.services import InsufficientStock, commit, release, reserve

from .models import Order, OrderPayment

PAYMENT_AUTHORITY_TTL = timedelta(minutes=30)
ACTIVE_PAYMENT_STATUSES = (
    OrderPayment.Status.INITIATING,
    OrderPayment.Status.READY,
    OrderPayment.Status.UNKNOWN,
)


def cancel_pending_order(order):
    payment = order.payments.filter(status__in=ACTIVE_PAYMENT_STATUSES).first()
    if payment:
        if payment.created_at > timezone.now() - PAYMENT_AUTHORITY_TTL:
            return False
        payment.status = OrderPayment.Status.EXPIRED
        payment.save(update_fields=("status", "updated_at"))
    if order.status != Order.Status.PENDING:
        return False
    for item in order.items.select_related("variant").order_by("variant_id"):
        release(item.variant_id, item.quantity)
    order.status = Order.Status.CANCELLED
    order.save(update_fields=("status", "updated_at"))
    return True


def settle_order(order_id):
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        if order.status == Order.Status.PAID:
            return "paid"
        items = list(order.items.select_related("variant").order_by("variant_id"))

        if order.status == Order.Status.CANCELLED:
            try:
                with transaction.atomic():
                    for item in items:
                        reserve(item.variant_id, item.quantity)
            except InsufficientStock:
                order.status = Order.Status.PAID
                order.save(update_fields=("status", "updated_at"))
                return "paid_unfulfilled"

        for item in items:
            commit(item.variant_id, item.quantity)
        for item in items:
            Product.objects.filter(pk=item.variant.product_id).update(
                sales_count=F("sales_count") + item.quantity
            )
        order.status = Order.Status.PAID
        order.save(update_fields=("status", "updated_at"))
        return "paid"


def build_accounting_report(orders):
    from collections import OrderedDict

    orders = list(orders)
    months = OrderedDict()
    totals = _accounting_bucket()
    status_counts = {status: 0 for status, _ in Order.Status.choices}
    products = {}
    order_details = []

    for order in sorted(orders, key=lambda value: value.created_at, reverse=True):
        status_counts[order.status] += 1
        items = list(order.items.all())
        units = sum(item.quantity for item in items)
        missing_cost = any(item.unit_cost is None for item in items)
        cost = None if missing_cost else sum(
            int(item.unit_cost) * item.quantity for item in items
        )
        order_subtotal = int(order.subtotal)
        product_discount = int(order.product_discount)
        coupon_discount = int(order.coupon_discount)
        collected = int(order.total)
        # Older orders can retain the tax amount that was actually charged before tax was removed.
        revenue = max(0, collected - int(order.tax_amount))
        order_payment = _latest_payment(order)
        line_totals = [int(item.line_total) for item in items]
        line_total_sum = sum(line_totals)
        coupon_remaining = coupon_discount
        line_coupon_discounts = []
        for index, line_total in enumerate(line_totals):
            if index == len(line_totals) - 1:
                allocation = coupon_remaining
            elif line_total_sum:
                allocation = min(
                    coupon_remaining,
                    (coupon_discount * line_total + line_total_sum // 2) // line_total_sum,
                )
            else:
                allocation = 0
            line_coupon_discounts.append(allocation)
            coupon_remaining -= allocation
        order_details.append({
            "pk": order.pk,
            "number": str(order.order_number),
            "created": timezone.localtime(order.created_at).strftime("%Y-%m-%d %H:%M"),
            "customer": order.recipient_name,
            "phone": order.recipient_phone,
            "status": order.get_status_display(),
            "status_code": order.status,
            "payment_status": order_payment.get_status_display() if order_payment else "ثبت نشده",
            "units": units,
            "subtotal": order_subtotal,
            "product_discount": product_discount,
            "coupon_discount": coupon_discount,
            "order_total": collected,
            "collected": collected if order.status == Order.Status.PAID else 0,
            "cost": cost or 0,
            "cost_complete": order.status == Order.Status.PAID and not missing_cost,
            "profit": revenue - cost if order.status == Order.Status.PAID and cost is not None else None,
            "items": [
                f"{item.product_name} ({item.color_name} / {item.size_name}) × {item.quantity}"
                for item in items
            ],
        })

        if order.status != Order.Status.PAID:
            continue

        month_key = timezone.localtime(order.created_at).strftime("%Y-%m")
        month = months.setdefault(month_key, _accounting_bucket())
        month["month"] = month_key

        for bucket in (totals, month):
            bucket["orders"] += 1
            bucket["units"] += units
            bucket["revenue"] += revenue
            bucket["product_discount"] += product_discount
            bucket["coupon_discount"] += coupon_discount
            bucket["collected"] += collected
            if missing_cost:
                bucket["incomplete_orders"] += 1
            else:
                bucket["cost"] += cost
                bucket["profit"] += revenue - cost
                bucket["cost_complete_orders"] += 1
                bucket["cost_complete_revenue"] += revenue

        for item, line_coupon_discount in zip(items, line_coupon_discounts):
            product = item.variant.product
            category = product.category.name if product.category_id else "بدون دسته‌بندی"
            key = (item.product_name, item.sku, category)
            entry = products.setdefault(key, {
                "name": item.product_name,
                "sku": item.sku,
                "category": category,
                "units": 0,
                "orders": 0,
                "revenue": 0,
                "coupon_discount": 0,
                "known_cost": 0,
                "cost_complete": True,
            })
            entry["units"] += item.quantity
            entry["orders"] += 1
            entry["revenue"] += int(item.line_total) - line_coupon_discount
            entry["coupon_discount"] += line_coupon_discount
            if item.unit_cost is None:
                entry["cost_complete"] = False
            else:
                entry["known_cost"] += int(item.unit_cost) * item.quantity

    totals["all_orders"] = sum(status_counts.values())
    totals["pending_orders"] = status_counts[Order.Status.PENDING]
    totals["cancelled_orders"] = status_counts[Order.Status.CANCELLED]
    totals["average_order_value"] = round(totals["collected"] / totals["orders"]) if totals["orders"] else 0
    totals["average_unit_revenue"] = round(totals["revenue"] / totals["units"]) if totals["units"] else 0
    totals["discounts"] = totals["product_discount"] + totals["coupon_discount"]
    totals["discounted_orders"] = sum(
        1 for order in orders
        if order.status == Order.Status.PAID and (order.product_discount or order.coupon_discount)
    )
    totals["profit_margin"] = round(
        totals["profit"] * 100 / totals["cost_complete_revenue"], 1
    ) if totals["cost_complete_revenue"] else None
    for month in months.values():
        month["discounts"] = month["product_discount"] + month["coupon_discount"]
        month["average_order_value"] = round(month["collected"] / month["orders"]) if month["orders"] else 0
    for product in products.values():
        product["cost"] = product.pop("known_cost") if product["cost_complete"] else None
        product["profit"] = (
            product["revenue"] - product["cost"] if product["cost_complete"] else None
        )

    return {
        "totals": totals,
        "months": list(months.values()),
        "statuses": [
            {"code": status, "label": label, "count": status_counts[status]}
            for status, label in Order.Status.choices
        ],
        "products": sorted(
            products.values(),
            key=lambda product: (product["units"], product["revenue"]),
            reverse=True,
        ),
        "order_details": order_details,
    }


def _accounting_bucket():
    return {
        "orders": 0,
        "units": 0,
        "revenue": 0,
        "product_discount": 0,
        "coupon_discount": 0,
        "collected": 0,
        "cost": 0,
        "profit": 0,
        "incomplete_orders": 0,
        "cost_complete_orders": 0,
        "cost_complete_revenue": 0,
    }


def _latest_payment(order):
    payments = getattr(order, "_prefetched_objects_cache", {}).get("payments")
    return payments[0] if payments else order.payments.first()
