from django.contrib import admin

from .models import Inventory


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("variant", "quantity", "reserved", "available", "low_stock_threshold")
    list_editable = ("quantity", "low_stock_threshold")
    list_select_related = ("variant__product", "variant__color", "variant__size")
    search_fields = ("variant__sku", "variant__product__name")
    list_filter = ("variant__product__category",)
    ordering = ("quantity",)

    @admin.display(description="قابل فروش")
    def available(self, obj):
        return obj.available
