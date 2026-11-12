from django.db import transaction
from rest_framework import serializers

from apps.accounts.serializers import PhoneField
from apps.catalog.models import ProductVariant
from apps.inventory.models import Inventory
from apps.inventory.services import InsufficientStock, reserve

from .discounts import coupon_discount
from .models import Order, OrderItem


class CheckoutItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product_name", "sku", "color_name", "size_name", "quantity", "unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_ref_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number", "status", "recipient_name", "recipient_phone", "province", "city",
            "address_line", "postal_code", "subtotal", "product_discount", "coupon_code",
            "coupon_discount", "total", "items", "created_at",
            "payment_status", "payment_ref_id",
        ]
        read_only_fields = fields

    def _latest_payment(self, obj):
        payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")
        return payments[0] if payments else obj.payments.first()

    def get_payment_status(self, obj):
        payment = self._latest_payment(obj)
        return payment.status if payment else None

    def get_payment_ref_id(self, obj):
        payment = self._latest_payment(obj)
        return payment.ref_id if payment and payment.status in (
            "paid",
            "paid_unfulfilled",
        ) else ""


class CheckoutSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    recipient_name = serializers.CharField(max_length=100)
    recipient_phone = PhoneField()
    province = serializers.CharField(max_length=60)
    city = serializers.CharField(max_length=60)
    address_line = serializers.CharField(max_length=300)
    postal_code = serializers.CharField(max_length=10)
    coupon_code = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")

    def validate_items(self, items):
        if len(items) > 20:
            raise serializers.ValidationError("در هر سفارش حداکثر ۲۰ ترکیب محصول مجاز است.")
        quantities = {}
        for item in items:
            variant_id = item["variant_id"]
            quantities[variant_id] = quantities.get(variant_id, 0) + item["quantity"]
        if any(quantity > 99 for quantity in quantities.values()):
            raise serializers.ValidationError("تعداد هر ترکیب محصول نمی‌تواند بیشتر از ۹۹ باشد.")
        return [{"variant_id": key, "quantity": value} for key, value in quantities.items()]

    def validate_postal_code(self, value):
        translation = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
        value = value.translate(translation).strip()
        if not (value.isdigit() and len(value) == 10):
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد.")
        return value

    def create(self, validated_data):
        requested = {item["variant_id"]: item["quantity"] for item in validated_data.pop("items")}
        coupon_code = validated_data.pop("coupon_code", "").strip().upper()

        with transaction.atomic():
            variants = {
                variant.pk: variant
                for variant in ProductVariant.objects.select_for_update()
                .filter(
                    pk__in=requested,
                    is_active=True,
                    product__is_active=True,
                    product__category__is_active=True,
                )
                .select_related("product", "color", "size")
                .order_by("pk")
            }
            if variants.keys() != requested.keys():
                raise serializers.ValidationError({"items": "یک یا چند محصول دیگر در دسترس نیست."})

            inventory_by_variant = Inventory.objects.filter(variant_id__in=requested).in_bulk(field_name="variant_id")
            subtotal = 0
            product_discount = 0
            item_data = []
            for variant_id in sorted(requested):
                variant = variants[variant_id]
                quantity = requested[variant_id]
                unit_price = int(variant.current_price)
                original_price = int(variant.product.price)
                if variant.price_override is not None:
                    original_price = unit_price
                subtotal += unit_price * quantity
                product_discount += max(original_price - unit_price, 0) * quantity
                item_data.append((variant, quantity, unit_price))

            if coupon_code:
                try:
                    coupon_savings = coupon_discount(coupon_code, subtotal)
                except ValueError as exc:
                    raise serializers.ValidationError({"coupon_code": str(exc)}) from exc
            else:
                coupon_savings = 0
            order_total = max(0, subtotal - coupon_savings)

            for variant_id in sorted(requested):
                if variant_id not in inventory_by_variant:
                    raise serializers.ValidationError({"items": "موجودی یکی از محصولات ثبت نشده است."})
                try:
                    reserve(variant_id, requested[variant_id])
                except InsufficientStock as exc:
                    raise serializers.ValidationError({
                        "items": f"موجودی کافی نیست؛ تعداد قابل خرید این محصول {exc.available} است."
                    }) from exc

            order = Order.objects.create(
                user=self.context["request"].user,
                subtotal=subtotal,
                product_discount=product_discount,
                coupon_code=coupon_code,
                coupon_discount=coupon_savings,
                total=order_total,
                **validated_data,
            )
            OrderItem.objects.bulk_create([
                OrderItem(
                    order=order,
                    variant=variant,
                    product_name=variant.product.name,
                    sku=variant.sku,
                    color_name=variant.color.name,
                    size_name=variant.size.name or variant.size.code,
                    quantity=quantity,
                    unit_price=unit_price,
                    unit_cost=variant.cost_price,
                    line_total=unit_price * quantity,
                )
                for variant, quantity, unit_price in item_data
            ])
            return order
