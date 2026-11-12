import logging
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderItem, OrderPayment
from .services import ACTIVE_PAYMENT_STATUSES, PAYMENT_AUTHORITY_TTL, cancel_pending_order, settle_order
from .serializers import CheckoutSerializer, OrderSerializer
from .zarinpal import ZarinpalError, request_payment, verify_payment

logger = logging.getLogger(__name__)


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = "order_number"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related(
                Prefetch("items", queryset=OrderItem.objects.select_related("variant")),
                Prefetch("payments", queryset=OrderPayment.objects.order_by("-created_at")),
            )
        )

    def create(self, request, *args, **kwargs):
        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def pay(self, request, order_number=None):
        if not settings.ZARINPAL_MERCHANT_ID or not settings.ZARINPAL_CALLBACK_URL:
            return Response(
                {"detail": "درگاه پرداخت پیکربندی نشده است؛ کلید و نشانی عمومی بازگشت زرین‌پال را تنظیم کنید."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        with transaction.atomic():
            order = get_object_or_404(
                self.get_queryset().select_for_update(),
                order_number=order_number,
            )
            if order.status != Order.Status.PENDING:
                return Response(
                    {"detail": "این سفارش در وضعیت قابل پرداخت نیست."},
                    status=status.HTTP_409_CONFLICT,
                )
            payment = order.payments.filter(status__in=ACTIVE_PAYMENT_STATUSES).first()
            if payment and payment.created_at <= timezone.now() - PAYMENT_AUTHORITY_TTL:
                payment.status = OrderPayment.Status.EXPIRED
                payment.save(update_fields=("status", "updated_at"))
                payment = None
            if payment:
                if payment.status == OrderPayment.Status.READY and payment.authority:
                    return Response({"payment_url": self._payment_url(payment.authority)})
                return Response(
                    {"detail": "وضعیت درخواست پرداخت قبلی مشخص نیست؛ برای جلوگیری از پرداخت تکراری با پشتیبانی تماس بگیرید."},
                    status=status.HTTP_409_CONFLICT,
                )
            payment = OrderPayment.objects.create(
                order=order,
                amount_rial=int(order.total) * 10,
                status=OrderPayment.Status.INITIATING,
            )

        try:
            authority, payment_url = request_payment(
                amount_rial=payment.amount_rial,
                description=f"Order {order.order_number}",
                callback_url=settings.ZARINPAL_CALLBACK_URL,
                mobile=order.recipient_phone,
                email=getattr(order.user, "email", ""),
            )
        except ZarinpalError as exc:
            payment.status = OrderPayment.Status.UNKNOWN if exc.uncertain else OrderPayment.Status.FAILED
            payment.save(update_fields=("status", "updated_at"))
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        payment.authority = authority
        payment.status = OrderPayment.Status.READY
        payment.save(update_fields=("authority", "status", "updated_at"))
        return Response({"payment_url": payment_url})

    @staticmethod
    def _payment_url(authority):
        host = "https://sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "https://www.zarinpal.com"
        return f"{host}/pg/StartPay/{authority}"

    @action(detail=True, methods=["post"])
    def cancel(self, request, order_number=None):
        with transaction.atomic():
            order = get_object_or_404(
                self.get_queryset().select_for_update(),
                order_number=order_number,
            )
            if order.status != Order.Status.PENDING:
                return Response(
                    {"detail": "فقط سفارش‌های در انتظار پرداخت قابل لغو هستند."},
                    status=status.HTTP_409_CONFLICT,
                )
            if not cancel_pending_order(order):
                return Response(
                    {"detail": "پرداخت این سفارش آغاز شده یا وضعیت تراکنش نامشخص است؛ لغو فعلاً ممکن نیست."},
                    status=status.HTTP_409_CONFLICT,
                )
        return Response(OrderSerializer(order, context={"request": request}).data)


class ZarinpalCallbackView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = []

    def get(self, request):
        authority = request.query_params.get("Authority", "")
        payment = OrderPayment.objects.select_related("order", "order__user").filter(
            gateway="zarinpal",
            authority=authority,
        ).first()
        if not payment:
            return HttpResponseRedirect(self._result_url("failed"))
        if payment.status in (OrderPayment.Status.PAID, OrderPayment.Status.PAID_UNFULFILLED):
            return HttpResponseRedirect(self._result_url("success", payment.order))
        if request.query_params.get("Status") != "OK":
            payment.status = OrderPayment.Status.FAILED
            payment.save(update_fields=("status", "updated_at"))
            return HttpResponseRedirect(self._result_url("failed", payment.order))

        try:
            ref_id, gateway_code = verify_payment(
                authority=payment.authority,
                amount_rial=payment.amount_rial,
            )
        except ZarinpalError:
            logger.exception("Zarinpal verification failed for payment %s.", payment.pk)
            return HttpResponseRedirect(self._result_url("failed", payment.order))

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=payment.order_id)
            payment = OrderPayment.objects.select_for_update().get(pk=payment.pk)
            if payment.status in (OrderPayment.Status.PAID, OrderPayment.Status.PAID_UNFULFILLED):
                result = "success"
            else:
                result = settle_order(payment.order_id)
                payment.ref_id = ref_id
                payment.gateway_code = gateway_code
                payment.status = (
                    OrderPayment.Status.PAID
                    if result == "paid"
                    else OrderPayment.Status.PAID_UNFULFILLED
                )
                payment.verified_at = timezone.now()
                payment.save(update_fields=(
                    "ref_id", "gateway_code", "status", "verified_at", "updated_at"
                ))
                if result == "paid_unfulfilled":
                    logger.error(
                        "Paid order %s could not be fulfilled because stock was unavailable.",
                        payment.order.order_number,
                    )
        result_status = "review" if result == "paid_unfulfilled" else "success"
        return HttpResponseRedirect(self._result_url(result_status, payment.order))

    @staticmethod
    def _result_url(result, order=None):
        query = {"payment": result}
        if order:
            query["order_number"] = str(order.order_number)
        return f"{settings.FRONTEND_URL.rstrip('/')}/account?{urlencode(query)}"
