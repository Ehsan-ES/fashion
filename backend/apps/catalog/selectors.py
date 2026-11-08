from django.db.models import Exists, ExpressionWrapper, F, IntegerField, OuterRef, Prefetch
from django.db.models.functions import Coalesce

from .models import Product, ProductImage, ProductVariant


def available_variants(product_ref="pk"):
    """Variantهای فعال با موجودی قابل‌فروش (quantity > reserved)."""
    return ProductVariant.objects.filter(
        product=OuterRef(product_ref),
        is_active=True,
        inventory__quantity__gt=F("inventory__reserved"),
    )


def product_queryset():
    """QuerySet پایه محصولات فعال، بهینه (بدون N+1) و با فیلدهای محاسبه‌شده."""
    return (
        Product.objects.filter(is_active=True, category__is_active=True)
        .select_related("brand", "category", "model_size")
        .prefetch_related(
            Prefetch("images", queryset=ProductImage.objects.select_related("color").order_by("position", "id")),
            Prefetch(
                "variants",
                queryset=ProductVariant.objects.filter(is_active=True)
                .select_related("color", "size", "inventory")
                .order_by("color__name", "size__sort_order"),
            ),
        )
        .annotate(
            final_price=Coalesce("sale_price", "price"),
            in_stock=Exists(available_variants()),
            popularity=ExpressionWrapper(F("views_count") + F("sales_count") * 5, output_field=IntegerField()),
        )
    )
