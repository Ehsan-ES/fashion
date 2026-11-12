import csv
from datetime import date, timedelta

from django.contrib import admin, messages
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse, HttpResponseForbidden
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone

from .models import Order, OrderItem, OrderPayment
from .services import build_accounting_report, cancel_pending_order, settle_order


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = (
        "variant", "product_name", "sku", "color_name", "size_name",
        "quantity", "unit_price", "unit_cost", "line_total",
    )


class OrderPaymentInline(admin.TabularInline):
    model = OrderPayment
    extra = 0
    can_delete = False
    fields = ("gateway", "status", "amount_rial", "authority", "ref_id", "gateway_code", "created_at", "verified_at")
    readonly_fields = fields


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    change_list_template = "admin/orders/order/change_list.html"
    list_display = ("order_number", "user", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "user__phone", "recipient_name", "recipient_phone")
    readonly_fields = (
        "order_number", "user", "status", "recipient_name", "recipient_phone", "province", "city",
        "address_line", "postal_code", "subtotal", "product_discount", "coupon_code",
        "coupon_discount", "total", "created_at", "updated_at",
    )
    inlines = [OrderItemInline, OrderPaymentInline]
    actions = ("mark_paid", "cancel_orders")

    def get_urls(self):
        return [
            path(
                "accounting/",
                self.admin_site.admin_view(self.accounting_view),
                name="orders_order_accounting",
            ),
        ] + super().get_urls()

    def accounting_view(self, request):
        if not request.user.has_perm("orders.view_order"):
            return HttpResponseForbidden("شما مجوز مشاهده گزارش حسابداری را ندارید.")

        today = timezone.localdate()
        default_start = today.replace(day=1)
        try:
            start_date = date.fromisoformat(request.GET.get("start", default_start.isoformat()))
            end_date = date.fromisoformat(request.GET.get("end", today.isoformat()))
            if start_date > end_date or end_date - start_date > timedelta(days=366):
                raise ValueError
        except ValueError:
            start_date, end_date = default_start, today
            date_error = "بازه گزارش معتبر نیست؛ حداکثر بازه مجاز ۳۶۶ روز است."
        else:
            date_error = ""

        orders = list(
            Order.objects.filter(
                created_at__date__range=(start_date, end_date),
            )
            .prefetch_related(Prefetch(
                "items",
                queryset=OrderItem.objects.select_related(
                    "variant__product__category",
                ).only(
                    "order_id", "variant_id", "product_name", "sku", "color_name",
                    "size_name", "quantity", "unit_price", "line_total", "unit_cost",
                    "variant__product__category__name",
                ),
            ))
            .prefetch_related("payments")
            .order_by("created_at")
        )
        report = build_accounting_report(orders)
        if request.GET.get("format") == "csv":
            response = HttpResponse(content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = (
                f'attachment; filename="boutique-accounting-{start_date.isoformat()}-{end_date.isoformat()}.csv"'
            )
            response.write("\ufeff")
            writer = csv.writer(response)
            writer.writerow(["MONTHLY SUMMARY"])
            writer.writerow([
                "Month", "Paid orders", "Units sold", "Sales (Toman)",
                "Product discounts (Toman)", "Coupon discounts (Toman)",
                "Collected (Toman)", "COGS (Toman)", "Gross profit (Toman)",
                "Orders missing cost",
            ])
            for month in report["months"]:
                writer.writerow([
                    month["month"], month["orders"], month["units"], month["revenue"],
                    month["product_discount"], month["coupon_discount"],
                    month["collected"], month["cost"], month["profit"], month["incomplete_orders"],
                ])
            writer.writerow([])
            writer.writerow(["TOP PRODUCTS / VARIANTS"])
            writer.writerow([
                "Product", "SKU", "Category", "Units", "Orders", "Sales (Toman)",
                "COGS (Toman)", "Gross profit (Toman)", "Cost data complete",
            ])
            for product in report["products"]:
                writer.writerow([
                    product["name"], product["sku"], product["category"], product["units"],
                    product["orders"], product["revenue"], product["cost"],
                    product["profit"] if product["cost_complete"] else "",
                    "yes" if product["cost_complete"] else "no",
                ])
            writer.writerow([])
            writer.writerow(["ORDER DETAILS"])
            writer.writerow([
                "Order number", "Created", "Customer", "Phone", "Status", "Payment",
                "Units", "Subtotal (Toman)", "Product discount (Toman)",
                "Coupon discount (Toman)", "Order total (Toman)", "Collected (Toman)",
                "COGS (Toman)", "Gross profit (Toman)",
            ])
            for order in report["order_details"]:
                writer.writerow([
                    order["number"], order["created"], order["customer"], order["phone"],
                    order["status"], order["payment_status"], order["units"], order["subtotal"],
                    order["product_discount"], order["coupon_discount"], order["order_total"],
                    order["collected"],
                    order["cost"] if order["cost_complete"] else "",
                    order["profit"] if order["cost_complete"] else "",
                ])
            return response

        context = {
            **self.admin_site.each_context(request),
            "title": "گزارش حسابداری",
            "opts": self.model._meta,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "date_error": date_error,
            "report": report,
            "csv_url": f"?{request.GET.copy().urlencode()}&format=csv",
        }
        return TemplateResponse(request, "admin/orders/accounting.html", context)

    @admin.action(description="تأیید پرداخت و کسر موجودی")
    def mark_paid(self, request, queryset):
        changed = 0
        unfulfilled = 0
        for order_id in queryset.filter(status=Order.Status.PENDING).values_list("pk", flat=True):
            if settle_order(order_id) == "paid":
                changed += 1
            else:
                unfulfilled += 1
        self.message_user(request, f"{changed} سفارش تأیید شد.", level=messages.SUCCESS)
        if unfulfilled:
            self.message_user(
                request,
                f"{unfulfilled} سفارش به‌دلیل کمبود موجودی پرداخت‌پذیر نشد و نیازمند بررسی است.",
                level=messages.ERROR,
            )

    @admin.action(description="لغو سفارش و آزادسازی موجودی")
    def cancel_orders(self, request, queryset):
        changed = 0
        for order_id in queryset.filter(status=Order.Status.PENDING).values_list("pk", flat=True):
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order_id)
                if not cancel_pending_order(order):
                    self.message_user(
                        request,
                        f"لغو سفارش {order.order_number} انجام نشد؛ تراکنش فعال یا نامشخص است.",
                        level=messages.ERROR,
                    )
                    continue
                changed += 1
        self.message_user(request, f"{changed} سفارش لغو شد و موجودی آزاد شد.", level=messages.SUCCESS)
