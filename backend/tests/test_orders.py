from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.models import Permission
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.inventory.models import Inventory
from apps.orders.models import Order, OrderItem, OrderPayment
from apps.orders.services import build_accounting_report

from .factories import make_product

pytestmark = pytest.mark.django_db

CHECKOUT = "/api/orders/"


def checkout_payload(variant_id, **overrides):
    payload = {
        "items": [{"variant_id": variant_id, "quantity": 2}],
        "recipient_name": "مریم رضایی",
        "recipient_phone": "۰۹۱۲۳۴۵۶۷۸۹",
        "province": "تهران",
        "city": "تهران",
        "address_line": "خیابان ولیعصر، پلاک ۱۰",
        "postal_code": "۱۲۳۴۵۶۷۸۹۰",
    }
    payload.update(overrides)
    return payload


def authenticated_client(phone="09123456789"):
    user = get_user_model().objects.create_user(phone=phone)
    client = APIClient()
    client.force_authenticate(user)
    return client, user


def test_checkout_requires_authentication():
    product = make_product()
    response = APIClient().post(CHECKOUT, checkout_payload(product.variants.get().pk), format="json")
    assert response.status_code == 401
    assert Order.objects.count() == 0


def test_checkout_uses_server_prices_applies_coupon_and_reserves_stock():
    product = make_product(price=2_000_000, sale_price=1_500_000, variants=(("black", "M", 4),))
    variant = product.variants.get()
    client, user = authenticated_client()
    payload = checkout_payload(variant.pk, coupon_code=" welcome10 ")
    payload["items"][0]["client_price"] = 1

    response = client.post(CHECKOUT, payload, format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == Order.Status.PENDING
    assert body["recipient_phone"] == "09123456789"
    assert body["postal_code"] == "1234567890"
    assert body["subtotal"] == "3000000"
    assert body["product_discount"] == "1000000"
    assert body["coupon_code"] == "WELCOME10"
    assert body["coupon_discount"] == "300000"
    assert "tax_rate" not in body
    assert "tax_amount" not in body
    assert body["total"] == "2700000"
    assert Order.objects.get().tax_amount == 0
    assert body["items"][0]["unit_price"] == "1500000"
    assert body["items"][0]["quantity"] == 2
    assert Order.objects.get().user == user
    inventory = Inventory.objects.get(variant=variant)
    assert (inventory.quantity, inventory.reserved) == (4, 2)


def test_checkout_snapshots_variant_cost_for_later_profit_reports():
    product = make_product(price=2_000_000, variants=(("black", "M", 4),))
    variant = product.variants.get()
    variant.cost_price = 700_000
    variant.save(update_fields=("cost_price",))
    client, _ = authenticated_client()

    response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")

    assert response.status_code == 201
    item = OrderItem.objects.get()
    assert item.unit_cost == 700_000
    assert item.line_total == 4_000_000
    assert item.unit_cost not in response.json()["items"][0]


def test_checkout_rejects_invalid_coupon_without_reserving_stock():
    product = make_product()
    variant = product.variants.get()
    client, _ = authenticated_client()

    response = client.post(CHECKOUT, checkout_payload(variant.pk, coupon_code="UNKNOWN"), format="json")

    assert response.status_code == 400
    assert "coupon_code" in response.json()["error"]["details"]
    assert Order.objects.count() == 0
    assert Inventory.objects.get(variant=variant).reserved == 0


def test_checkout_rolls_back_all_reservations_if_any_line_is_out_of_stock():
    product = make_product(variants=(("black", "M", 3), ("white", "M", 1)))
    variants = list(product.variants.order_by("pk"))
    client, _ = authenticated_client()
    payload = checkout_payload(variants[0].pk)
    payload["items"] = [
        {"variant_id": variants[0].pk, "quantity": 2},
        {"variant_id": variants[1].pk, "quantity": 2},
    ]

    response = client.post(CHECKOUT, payload, format="json")

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert all(Inventory.objects.get(variant=variant).reserved == 0 for variant in variants)


def test_order_can_only_be_cancelled_by_owner_and_releases_reserved_stock():
    product = make_product()
    variant = product.variants.get()
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")
    order_number = response.json()["order_number"]

    other_client, _ = authenticated_client("09123456780")
    assert other_client.post(f"{CHECKOUT}{order_number}/cancel/").status_code == 404

    cancel_response = client.post(f"{CHECKOUT}{order_number}/cancel/")

    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == Order.Status.CANCELLED
    assert Inventory.objects.get(variant=variant).reserved == 0


def test_payment_is_unavailable_without_merchant_and_callback_configuration():
    product = make_product()
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(product.variants.get().pk), format="json")
    order_number = response.json()["order_number"]

    with override_settings(ZARINPAL_MERCHANT_ID="", ZARINPAL_CALLBACK_URL=""):
        payment_response = client.post(f"{CHECKOUT}{order_number}/pay/")

    assert payment_response.status_code == 503
    assert OrderPayment.objects.count() == 0


def test_order_owner_is_required_to_start_payment():
    product = make_product()
    owner_client, _ = authenticated_client()
    order_response = owner_client.post(
        CHECKOUT,
        checkout_payload(product.variants.get().pk),
        format="json",
    )
    other_client, _ = authenticated_client("09123456780")

    with (
        override_settings(
            ZARINPAL_MERCHANT_ID="test-merchant",
            ZARINPAL_CALLBACK_URL="https://shop.example/api/payments/zarinpal/callback/",
        ),
        patch("apps.orders.views.request_payment") as request_payment_mock,
    ):
        response = other_client.post(f"{CHECKOUT}{order_response.json()['order_number']}/pay/")

    assert response.status_code == 404
    assert OrderPayment.objects.count() == 0
    request_payment_mock.assert_not_called()


def test_payment_request_uses_server_total_converted_from_toman_to_rial():
    product = make_product(price=2_000_000, sale_price=1_500_000, variants=(("black", "M", 4),))
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(product.variants.get().pk), format="json")
    order_number = response.json()["order_number"]

    with (
        override_settings(
            ZARINPAL_MERCHANT_ID="test-merchant",
            ZARINPAL_CALLBACK_URL="https://shop.example/api/payments/zarinpal/callback/",
            ZARINPAL_SANDBOX=True,
        ),
        patch("apps.orders.views.request_payment", return_value=("A0000000000000000000000000000000000", "https://sandbox.zarinpal.com/pg/StartPay/A0000000000000000000000000000000000")) as request_payment_mock,
    ):
        payment_response = client.post(f"{CHECKOUT}{order_number}/pay/")

    assert payment_response.status_code == 200
    assert payment_response.json()["payment_url"].startswith("https://sandbox.zarinpal.com/")
    payment = OrderPayment.objects.get()
    assert payment.amount_rial == 3_000_000 * 10
    assert payment.status == OrderPayment.Status.READY
    request_payment_mock.assert_called_once()
    assert request_payment_mock.call_args.kwargs["amount_rial"] == 30_000_000


def test_successful_gateway_callback_verifies_payment_and_commits_reserved_stock():
    product = make_product(variants=(("black", "M", 4),))
    variant = product.variants.get()
    client, _ = authenticated_client()
    order_response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")
    order = Order.objects.get(order_number=order_response.json()["order_number"])
    payment = OrderPayment.objects.create(
        order=order,
        authority="A0000000000000000000000000000000000",
        amount_rial=int(order.total) * 10,
        status=OrderPayment.Status.READY,
    )

    with patch("apps.orders.views.verify_payment", return_value=("123456789", 100)) as verify_mock:
        callback = APIClient().get(
            "/api/payments/zarinpal/callback/",
            {"Authority": payment.authority, "Status": "OK"},
        )

    assert callback.status_code == 302
    assert "payment=success" in callback["Location"]
    verify_mock.assert_called_once_with(authority=payment.authority, amount_rial=int(order.total) * 10)
    order.refresh_from_db()
    payment.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert payment.status == OrderPayment.Status.PAID
    assert payment.ref_id == "123456789"
    inventory = Inventory.objects.get(variant=variant)
    assert (inventory.quantity, inventory.reserved) == (2, 0)
    product.refresh_from_db()
    assert product.sales_count == 2


def test_declined_gateway_callback_does_not_mark_order_paid_or_commit_stock():
    product = make_product(variants=(("black", "M", 4),))
    variant = product.variants.get()
    client, _ = authenticated_client()
    order_response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")
    order = Order.objects.get(order_number=order_response.json()["order_number"])
    payment = OrderPayment.objects.create(
        order=order,
        authority="A0000000000000000000000000000000004",
        amount_rial=int(order.total) * 10,
        status=OrderPayment.Status.READY,
    )

    with patch("apps.orders.views.verify_payment") as verify_mock:
        callback = APIClient().get(
            "/api/payments/zarinpal/callback/",
            {"Authority": payment.authority, "Status": "NOK"},
        )

    assert callback.status_code == 302
    assert "payment=failed" in callback["Location"]
    verify_mock.assert_not_called()
    order.refresh_from_db()
    payment.refresh_from_db()
    assert order.status == Order.Status.PENDING
    assert payment.status == OrderPayment.Status.FAILED
    assert Inventory.objects.get(variant=variant).reserved == 2


def test_duplicate_success_callback_does_not_commit_inventory_twice():
    product = make_product(variants=(("black", "M", 4),))
    variant = product.variants.get()
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")
    order = Order.objects.get(order_number=response.json()["order_number"])
    payment = OrderPayment.objects.create(
        order=order,
        authority="A0000000000000000000000000000000001",
        amount_rial=int(order.total) * 10,
        status=OrderPayment.Status.READY,
    )

    with patch("apps.orders.views.verify_payment", return_value=("123456789", 100)) as verify_mock:
        callback = APIClient().get(
            "/api/payments/zarinpal/callback/",
            {"Authority": payment.authority, "Status": "OK"},
        )
        repeated = APIClient().get(
            "/api/payments/zarinpal/callback/",
            {"Authority": payment.authority, "Status": "OK"},
        )

    assert callback.status_code == repeated.status_code == 302
    assert verify_mock.call_count == 1
    inventory = Inventory.objects.get(variant=variant)
    assert (inventory.quantity, inventory.reserved) == (2, 0)
    product.refresh_from_db()
    assert product.sales_count == 2


def test_paid_callback_marks_order_paid_when_stock_was_taken_after_cancellation():
    product = make_product(variants=(("black", "M", 4),))
    variant = product.variants.get()
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(variant.pk), format="json")
    order = Order.objects.get(order_number=response.json()["order_number"])
    OrderPayment.objects.create(
        order=order,
        authority="A0000000000000000000000000000000003",
        amount_rial=int(order.total) * 10,
        status=OrderPayment.Status.READY,
    )
    assert client.post(f"{CHECKOUT}{order.order_number}/cancel/").status_code == 409

    order.status = Order.Status.CANCELLED
    order.save(update_fields=("status",))
    Inventory.objects.filter(variant=variant).update(quantity=0, reserved=0)

    with patch("apps.orders.views.verify_payment", return_value=("123456789", 100)):
        callback = APIClient().get(
            "/api/payments/zarinpal/callback/",
            {"Authority": "A0000000000000000000000000000000003", "Status": "OK"},
        )

    order.refresh_from_db()
    assert callback.status_code == 302
    assert "payment=review" in callback["Location"]
    assert order.status == Order.Status.PAID
    payment = OrderPayment.objects.get(order=order)
    assert payment.status == OrderPayment.Status.PAID_UNFULFILLED
    report = build_accounting_report(Order.objects.filter(pk=order.pk).prefetch_related("items"))
    assert report["totals"]["orders"] == 1
    assert report["totals"]["collected"] == int(order.total)


def test_cannot_cancel_order_while_gateway_authority_is_active():
    product = make_product()
    client, _ = authenticated_client()
    response = client.post(CHECKOUT, checkout_payload(product.variants.get().pk), format="json")
    order_number = response.json()["order_number"]
    order = Order.objects.get(order_number=order_number)
    OrderPayment.objects.create(
        order=order,
        authority="A0000000000000000000000000000000002",
        amount_rial=int(order.total) * 10,
        status=OrderPayment.Status.READY,
    )

    cancel_response = client.post(f"{CHECKOUT}{order_number}/cancel/")

    assert cancel_response.status_code == 409
    assert Inventory.objects.get(variant=product.variants.get()).reserved == 2


def test_accounting_report_excludes_incomplete_costs_from_profit():
    product = make_product(
        price=2_000_000,
        variants=(("black", "M", 6), ("white", "M", 6)),
    )
    variants = list(product.variants.order_by("pk"))
    variants[0].cost_price = 500_000
    variants[0].save(update_fields=("cost_price",))
    client, _ = authenticated_client()
    complete_response = client.post(CHECKOUT, checkout_payload(variants[0].pk), format="json")
    complete = Order.objects.get(order_number=complete_response.json()["order_number"])
    complete.status = Order.Status.PAID
    complete.save(update_fields=("status",))

    incomplete_response = client.post(CHECKOUT, checkout_payload(variants[1].pk), format="json")
    incomplete = Order.objects.get(order_number=incomplete_response.json()["order_number"])
    incomplete.status = Order.Status.PAID
    incomplete.save(update_fields=("status",))

    pending_response = client.post(CHECKOUT, checkout_payload(variants[0].pk), format="json")
    pending = Order.objects.get(order_number=pending_response.json()["order_number"])
    report = build_accounting_report(
        Order.objects.filter(pk__in=[complete.pk, incomplete.pk, pending.pk])
        .prefetch_related("items", "payments")
    )
    assert report["totals"]["orders"] == 2
    assert report["totals"]["units"] == 4
    assert report["totals"]["revenue"] == 8_000_000
    assert report["totals"]["product_discount"] == 0
    assert report["totals"]["coupon_discount"] == 0
    assert report["totals"]["all_orders"] == 3
    assert report["totals"]["pending_orders"] == 1
    assert report["totals"]["pending_orders"] == 1
    assert report["totals"]["cost"] == 1_000_000
    assert report["totals"]["profit"] == 3_000_000
    assert report["totals"]["incomplete_orders"] == 1
    assert report["totals"]["average_order_value"] == 4_000_000
    assert report["totals"]["profit_margin"] == 75
    complete_product = next(
        row for row in report["products"] if row["sku"] == variants[0].sku
    )
    assert complete_product["units"] == 2
    assert complete_product["cost_complete"] is True
    assert len(report["order_details"]) == 3
    pending_detail = next(row for row in report["order_details"] if row["pk"] == pending.pk)
    assert pending_detail["order_total"] == int(pending.total)
    assert pending_detail["collected"] == 0
    assert pending_detail["cost_complete"] is False


def test_product_report_allocates_coupon_savings_so_sales_reconcile_to_order_total():
    product = make_product(
        price=1_000_000,
        variants=(("black", "M", 4), ("white", "M", 4)),
    )
    variants = list(product.variants.order_by("pk"))
    client, _ = authenticated_client()
    payload = checkout_payload(variants[0].pk, coupon_code="WELCOME10")
    payload["items"] = [
        {"variant_id": variants[0].pk, "quantity": 2},
        {"variant_id": variants[1].pk, "quantity": 2},
    ]

    response = client.post(CHECKOUT, payload, format="json")
    order = Order.objects.get(order_number=response.json()["order_number"])
    order.status = Order.Status.PAID
    order.save(update_fields=("status",))
    report = build_accounting_report(
        Order.objects.filter(pk=order.pk).prefetch_related("items__variant__product__category")
    )

    assert order.total == 3_600_000
    assert sum(product_row["revenue"] for product_row in report["products"]) == int(order.total)
    assert sum(product_row["coupon_discount"] for product_row in report["products"]) == 400_000
    assert report["totals"]["revenue"] == int(order.total)
    assert report["totals"]["coupon_discount"] == 400_000


def test_admin_accounting_dashboard_and_monthly_csv_require_permission():
    product = make_product()
    customer_client, _ = authenticated_client()
    order_response = customer_client.post(
        CHECKOUT,
        checkout_payload(product.variants.get().pk),
        format="json",
    )
    order = Order.objects.get(order_number=order_response.json()["order_number"])
    order.status = Order.Status.PAID
    order.save(update_fields=("status",))

    staff = get_user_model().objects.create_user(phone="09123456781")
    staff.is_staff = True
    staff.save(update_fields=("is_staff",))
    admin_client = APIClient()
    admin_client.force_login(staff)
    report_url = "/admin/orders/order/accounting/"
    date_range = {
        "start": (timezone.localdate() - timedelta(days=1)).isoformat(),
        "end": (timezone.localdate() + timedelta(days=1)).isoformat(),
    }

    forbidden = admin_client.get(report_url)
    assert forbidden.status_code == 403
    staff.user_permissions.add(
        Permission.objects.get(content_type__app_label="orders", codename="view_order")
    )

    dashboard = admin_client.get(report_url, date_range)
    csv_report = admin_client.get(report_url, {**date_range, "format": "csv"})

    assert dashboard.status_code == 200
    assert "روند ماهانه" in dashboard.content.decode()
    assert "جزئیات سفارش‌ها" in dashboard.content.decode()
    assert "کالاها و ترکیب‌های پرفروش" in dashboard.content.decode()
    assert "boutique_admin.css" in dashboard.content.decode()
    assert csv_report.status_code == 200
    assert csv_report["Content-Type"].startswith("text/csv")
    assert "Sales (Toman)" in csv_report.content.decode("utf-8-sig")
    assert "TOP PRODUCTS / VARIANTS" in csv_report.content.decode("utf-8-sig")
    assert "ORDER DETAILS" in csv_report.content.decode("utf-8-sig")
    assert str(order.total) in csv_report.content.decode("utf-8-sig")
