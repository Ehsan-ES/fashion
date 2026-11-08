from django.db.models import Count, F, Max, Min, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from .filters import ProductFilter, StableOrderingFilter
from .models import Brand, Category, Collection, Color, Product, Size
from .selectors import product_queryset
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    CollectionSerializer,
    ColorSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    SizeSerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, StableOrderingFilter]
    search_fields = ["name", "brand__name", "category__name", "description"]
    ordering_fields = ["created_at", "final_price", "sales_count", "popularity", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = product_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related("collections")
        return qs

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == "retrieve" else ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Product.objects.filter(pk=instance.pk).update(views_count=F("views_count") + 1)
        return Response(self.get_serializer(instance).data)

    def _paginated(self, queryset):
        page = self.paginate_queryset(self.filter_queryset(queryset))
        data = ProductListSerializer(page, many=True, context=self.get_serializer_context()).data
        return self.get_paginated_response(data)

    @action(detail=False)
    def featured(self, request):
        return self._paginated(self.get_queryset().filter(is_featured=True))

    @action(detail=False, url_path="best-sellers")
    def best_sellers(self, request):
        self.ordering = ["-is_best_seller", "-sales_count"]
        return self._paginated(self.get_queryset())

    @action(detail=False, url_path="new-arrivals")
    def new_arrivals(self, request):
        return self._paginated(self.get_queryset())

    @action(detail=False)
    def sale(self, request):
        return self._paginated(self.get_queryset().filter(sale_price__isnull=False))

    @action(detail=False, url_path="filters")
    def facets(self, request):
        """گزینه‌های فیلتر قابل‌نمایش در صفحه فروشگاه (می‌تواند با gender/category محدود شود)."""
        params = {k: v for k, v in request.query_params.items() if k in ("gender", "category")}
        qs = ProductFilter(params, queryset=self.get_queryset(), request=request).qs
        ids = qs.values("pk")
        colors = Color.objects.filter(variants__product__in=ids, variants__is_active=True).distinct()
        sizes = Size.objects.filter(variants__product__in=ids, variants__is_active=True).distinct()
        brands = Brand.objects.filter(products__in=ids, is_active=True).distinct()
        agg = qs.aggregate(min=Min("final_price"), max=Max("final_price"))
        price = {k: (int(v) if v is not None else None) for k, v in agg.items()}
        return Response({
            "colors": ColorSerializer(colors, many=True).data,
            "sizes": SizeSerializer(sizes, many=True).data,
            "brands": [{"name": b.name, "slug": b.slug} for b in brands],
            "price": price,
        })

    @action(detail=True)
    def related(self, request, slug=None):
        product = self.get_object()
        qs = (
            self.get_queryset()
            .filter(category_id=product.category_id)
            .exclude(pk=product.pk)
            .order_by("-is_best_seller", "-sales_count", "-id")[:8]
        )
        return Response(ProductListSerializer(qs, many=True, context=self.get_serializer_context()).data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        qs = Category.objects.filter(is_active=True).prefetch_related("children")
        if self.action == "list":
            qs = qs.filter(parent__isnull=True)
        return qs


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    queryset = Brand.objects.filter(is_active=True)
    lookup_field = "slug"
    pagination_class = None
    filter_backends = []


class CollectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CollectionSerializer
    lookup_field = "slug"
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        qs = Collection.objects.filter(is_active=True).annotate(
            product_count=Count("products", filter=Q(products__is_active=True), distinct=True)
        )
        if self.request.query_params.get("featured") in ("1", "true", "True"):
            qs = qs.filter(is_featured=True)
        return qs
