from django import forms
from django.contrib import admin
from django.db.models import Sum
from django.utils.html import format_html

from apps.inventory.models import Inventory

from .models import (
    Brand, Category, Collection, Color, Product, ProductAnswer, ProductImage,
    ProductQuestion, ProductReview, ProductVariant, Size,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_active",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_editable = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "swatch")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="رنگ")
    def swatch(self, obj):
        return format_html(
            '<span style="display:inline-block;width:22px;height:22px;border:1px solid #999;background:{}"></span> {}',
            obj.hex_code, obj.hex_code,
        )


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "group", "sort_order")
    list_editable = ("sort_order",)
    list_filter = ("group",)


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_featured", "is_active", "sort_order")
    list_editable = ("is_featured", "is_active", "sort_order")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("products",)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image", "color", "alt", "position")


class VariantInlineForm(forms.ModelForm):
    stock = forms.IntegerField(label="موجودی", min_value=0, required=False)

    class Meta:
        model = ProductVariant
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            inv = getattr(self.instance, "inventory", None)
            if inv is not None:
                self.fields["stock"].initial = inv.quantity


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    form = VariantInlineForm
    extra = 0
    fields = ("color", "size", "sku", "price_override", "cost_price", "is_active", "stock")


class ProductAnswerInline(admin.TabularInline):
    model = ProductAnswer
    extra = 0
    fields = ("body", "is_approved", "created_at")
    readonly_fields = ("created_at",)


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "title", "is_approved", "created_at")
    list_filter = ("is_approved", "rating", "created_at")
    list_editable = ("is_approved",)
    search_fields = ("product__name", "user__phone", "title", "body")
    autocomplete_fields = ("product", "user")
    readonly_fields = ("created_at",)


@admin.register(ProductQuestion)
class ProductQuestionAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "short_body", "is_approved", "created_at")
    list_filter = ("is_approved", "created_at")
    list_editable = ("is_approved",)
    search_fields = ("product__name", "user__phone", "body")
    autocomplete_fields = ("product", "user")
    readonly_fields = ("created_at",)
    inlines = [ProductAnswerInline]

    @admin.display(description="پرسش")
    def short_body(self, obj):
        return obj.body[:80]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "brand", "gender", "price", "sale_price", "total_stock",
                    "is_active", "is_featured", "is_best_seller")
    list_editable = ("is_active", "is_featured", "is_best_seller")
    list_filter = ("is_active", "gender", "category", "brand", "is_featured", "is_best_seller")
    search_fields = ("name", "slug", "variants__sku")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("brand", "category")
    inlines = [ProductImageInline, ProductVariantInline]
    list_select_related = ("category", "brand")
    fieldsets = (
        (None, {"fields": ("name", "slug", "category", "brand", "gender", "is_active")}),
        ("قیمت", {"fields": ("price", "sale_price")}),
        ("جزئیات", {"fields": ("description", "material", "construction", "country_of_origin",
                               "model_height_cm", "model_size")}),
        ("نمایش در فروشگاه", {"fields": ("is_featured", "is_best_seller", "sales_count", "views_count")}),
        ("سئو", {"classes": ("collapse",), "fields": ("meta_title", "meta_description")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_stock=Sum("variants__inventory__quantity"))

    @admin.display(description="موجودی کل", ordering="_stock")
    def total_stock(self, obj):
        return obj._stock or 0

    def save_formset(self, request, form, formset, change):
        formset.save()
        if formset.model is ProductVariant:
            for f in formset.forms:
                data = getattr(f, "cleaned_data", None) or {}
                if data.get("DELETE") or not f.instance.pk:
                    continue
                stock = data.get("stock")
                if stock is not None:
                    Inventory.objects.update_or_create(variant=f.instance, defaults={"quantity": stock})
