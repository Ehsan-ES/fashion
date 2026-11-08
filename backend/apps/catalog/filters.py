from django.db.models import Exists, Q
from django_filters import rest_framework as filters
from rest_framework.filters import OrderingFilter

from .models import Category, Product
from .selectors import available_variants


class StableOrderingFilter(OrderingFilter):
    """مرتب‌سازی با tie-breaker روی id تا صفحه‌بندی بین صفحات تکراری/جاافتاده نداشته باشد."""

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset
        if not any(o.lstrip("-") == "id" for o in ordering):
            ordering = [*ordering, "-id"]
        return queryset.order_by(*ordering)


class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    pass


class ProductFilter(filters.FilterSet):
    gender = filters.CharFilter(method="filter_gender")
    category = filters.CharFilter(method="filter_category")
    brand = CharInFilter(field_name="brand__slug", lookup_expr="in")
    color = CharInFilter(method="noop")
    size = CharInFilter(method="noop")
    collection = filters.CharFilter(field_name="collections__slug")
    min_price = filters.NumberFilter(field_name="final_price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="final_price", lookup_expr="lte")
    on_sale = filters.BooleanFilter(method="filter_on_sale")
    in_stock = filters.BooleanFilter(method="filter_in_stock")
    is_new = filters.BooleanFilter(method="filter_is_new")

    class Meta:
        model = Product
        fields = []

    def noop(self, queryset, name, value):
        return queryset  # در filter_queryset و به‌صورت ترکیبی اعمال می‌شود

    def filter_gender(self, queryset, name, value):
        if value in (Product.Gender.WOMEN, Product.Gender.MEN):
            return queryset.filter(gender__in=[value, Product.Gender.UNISEX])
        if value == Product.Gender.UNISEX:
            return queryset.filter(gender=Product.Gender.UNISEX)
        return queryset.none()

    def filter_category(self, queryset, name, value):
        category = Category.objects.filter(slug=value, is_active=True).first()
        if category is None:
            return queryset.none()
        return queryset.filter(category_id__in=category.descendant_ids())

    def filter_on_sale(self, queryset, name, value):
        return queryset.filter(sale_price__isnull=not value)

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(in_stock=bool(value))

    def filter_is_new(self, queryset, name, value):
        from datetime import timedelta

        from django.conf import settings
        from django.utils import timezone

        threshold = timezone.now() - timedelta(days=settings.CATALOG_NEW_DAYS)
        return queryset.filter(Q(created_at__gte=threshold) if value else Q(created_at__lt=threshold))

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        colors = self.form.cleaned_data.get("color")
        sizes = self.form.cleaned_data.get("size")
        if colors or sizes:
            # رنگ و سایز باید روی «یک Variant موجود» هم‌زمان برقرار باشند
            variants = available_variants()
            if colors:
                variants = variants.filter(color__slug__in=colors)
            if sizes:
                variants = variants.filter(size__code__in=sizes)
            queryset = queryset.filter(Exists(variants))
        return queryset
