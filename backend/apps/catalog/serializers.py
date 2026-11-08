from rest_framework import serializers

from .models import Brand, Category, Collection, Color, Product, ProductImage, ProductVariant, Size


def _abs_url(serializer, file_field):
    if not file_field:
        return None
    url = file_field.url
    request = serializer.context.get("request")
    return request.build_absolute_uri(url) if request else url


class ColorSerializer(serializers.ModelSerializer):
    hex = serializers.CharField(source="hex_code")

    class Meta:
        model = Color
        fields = ["name", "slug", "hex"]


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["code", "name", "group"]


class BrandSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo", "description"]

    def get_logo(self, obj):
        return _abs_url(self, obj.logo)


class BrandMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["name", "slug"]


class CategoryMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["name", "slug"]


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image", "description", "meta_title", "meta_description", "children"]

    def get_image(self, obj):
        return _abs_url(self, obj.image)

    def get_children(self, obj):
        kids = [c for c in obj.children.all() if c.is_active]
        return [{"id": c.id, "name": c.name, "slug": c.slug, "image": _abs_url(self, c.image)} for c in kids]


class CollectionSerializer(serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "description", "cover_image", "is_featured", "product_count"]

    def get_cover_image(self, obj):
        return _abs_url(self, obj.cover_image)


class ProductListSerializer(serializers.ModelSerializer):
    brand = BrandMiniSerializer(read_only=True)
    category = CategoryMiniSerializer(read_only=True)
    final_price = serializers.DecimalField(source="current_price", max_digits=12, decimal_places=0, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    is_new = serializers.BooleanField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    image = serializers.SerializerMethodField()
    hover_image = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand", "category", "gender", "price", "sale_price", "final_price",
            "discount_percent", "is_new", "is_best_seller", "is_featured", "in_stock",
            "image", "hover_image", "colors",
        ]

    def _images(self, obj):
        return list(obj.images.all())

    def get_image(self, obj):
        imgs = self._images(obj)
        return _abs_url(self, imgs[0].image) if imgs else None

    def get_hover_image(self, obj):
        imgs = self._images(obj)
        return _abs_url(self, imgs[1].image) if len(imgs) > 1 else None

    def get_colors(self, obj):
        seen, out = set(), []
        for v in obj.variants.all():
            if v.color_id not in seen:
                seen.add(v.color_id)
                out.append(ColorSerializer(v.color).data)
        return out


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    color = serializers.SlugRelatedField(slug_field="slug", read_only=True)

    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt", "color", "position"]

    def get_url(self, obj):
        return _abs_url(self, obj.image)


class ProductVariantSerializer(serializers.ModelSerializer):
    color = ColorSerializer(read_only=True)
    size = SizeSerializer(read_only=True)
    price = serializers.DecimalField(source="current_price", max_digits=12, decimal_places=0, read_only=True)
    available = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "color", "size", "price", "available", "in_stock"]

    def _available(self, obj):
        inv = getattr(obj, "inventory", None)
        return inv.available if inv else 0

    def get_available(self, obj):
        return self._available(obj)

    def get_in_stock(self, obj):
        return self._available(obj) > 0


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    sizes = serializers.SerializerMethodField()
    model_size = serializers.CharField(source="model_size.code", read_only=True, default=None)
    collections = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description", "material", "construction", "country_of_origin", "model_height_cm", "model_size",
            "images", "variants", "sizes", "collections", "meta_title", "meta_description",
        ]

    def get_sizes(self, obj):
        seen, out = set(), []
        for v in sorted(obj.variants.all(), key=lambda v: (v.size.group, v.size.sort_order)):
            if v.size_id not in seen:
                seen.add(v.size_id)
                out.append(SizeSerializer(v.size).data)
        return out

    def get_collections(self, obj):
        return [{"name": c.name, "slug": c.slug} for c in obj.collections.all() if c.is_active]
