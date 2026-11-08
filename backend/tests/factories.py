from apps.catalog.models import Brand, Category, Color, Product, ProductImage, ProductVariant, Size
from apps.inventory.models import Inventory


def make_category(slug="shirt", name="پیراهن", parent=None, **kw):
    return Category.objects.get_or_create(slug=slug, defaults={"name": name, "parent": parent, **kw})[0]


def make_brand(slug="maison", name="Maison"):
    return Brand.objects.get_or_create(slug=slug, defaults={"name": name})[0]


def make_color(slug="black", hex_code="#111111"):
    return Color.objects.get_or_create(slug=slug, defaults={"name": slug, "hex_code": hex_code})[0]


def make_size(code="M", group="apparel", order=0):
    return Size.objects.get_or_create(code=code, defaults={"group": group, "sort_order": order})[0]


def make_product(slug="p1", name=None, category=None, brand=None, gender="women", price=1_000_000,
                 sale_price=None, variants=(("black", "M", 5),), **kw):
    """variants: (color_slug, size_code, stock)"""
    product = Product.objects.create(
        name=name or slug, slug=slug, category=category or make_category(),
        brand=brand or make_brand(), gender=gender, price=price, sale_price=sale_price, **kw,
    )
    for color_slug, size_code, stock in variants:
        v = ProductVariant.objects.create(
            product=product, color=make_color(color_slug), size=make_size(size_code))
        Inventory.objects.filter(variant=v).update(quantity=stock)
    return product
