from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone

from .fields import WebPImageField

hex_validator = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "رنگ باید به شکل #RRGGBB باشد.")


class Category(models.Model):
    name = models.CharField("نام", max_length=120)
    slug = models.SlugField("اسلاگ", max_length=140, unique=True, allow_unicode=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="children")
    image = WebPImageField("تصویر", upload_to="categories/%Y/%m/", blank=True, max_side=1600)
    description = models.TextField("توضیحات", blank=True)
    is_active = models.BooleanField("فعال", default=True)
    sort_order = models.PositiveIntegerField("ترتیب", default=0)
    meta_title = models.CharField(max_length=160, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"

    def __str__(self):
        return self.name

    def descendant_ids(self):
        """شناسه خود دسته و زیردسته‌ها (تا دو سطح)."""
        ids = {self.pk}
        children = list(Category.objects.filter(parent=self).values_list("pk", flat=True))
        ids.update(children)
        ids.update(Category.objects.filter(parent_id__in=children).values_list("pk", flat=True))
        return ids


class Brand(models.Model):
    name = models.CharField("نام", max_length=120, unique=True)
    slug = models.SlugField("اسلاگ", max_length=140, unique=True, allow_unicode=True)
    logo = WebPImageField("لوگو", upload_to="brands/%Y/%m/", blank=True, max_side=800)
    description = models.TextField("توضیحات", blank=True)
    is_active = models.BooleanField("فعال", default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "برند"
        verbose_name_plural = "برندها"

    def __str__(self):
        return self.name


class Color(models.Model):
    name = models.CharField("نام", max_length=60, unique=True)
    slug = models.SlugField(max_length=70, unique=True, allow_unicode=True)
    hex_code = models.CharField("کد رنگ", max_length=7, validators=[hex_validator])

    class Meta:
        ordering = ["name"]
        verbose_name = "رنگ"
        verbose_name_plural = "رنگ‌ها"

    def __str__(self):
        return self.name


class Size(models.Model):
    class Group(models.TextChoices):
        APPAREL = "apparel", "لباس"
        SHOE = "shoe", "کفش"
        ONE = "one", "فری‌سایز"

    code = models.CharField("کد سایز", max_length=10, unique=True)
    name = models.CharField("نام نمایشی", max_length=30, blank=True)
    group = models.CharField(max_length=10, choices=Group.choices, default=Group.APPAREL)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["group", "sort_order", "code"]
        verbose_name = "سایز"
        verbose_name_plural = "سایزها"

    def __str__(self):
        return self.code


class Product(models.Model):
    class Gender(models.TextChoices):
        WOMEN = "women", "زنانه"
        MEN = "men", "مردانه"
        UNISEX = "unisex", "یونیسکس"

    name = models.CharField("نام", max_length=200)
    slug = models.SlugField("اسلاگ", max_length=220, unique=True, allow_unicode=True)
    brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.PROTECT, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    gender = models.CharField("جنسیت", max_length=10, choices=Gender.choices)

    description = models.TextField("توضیحات", blank=True)
    material = models.CharField("جنس پارچه", max_length=200, blank=True)
    construction = models.CharField("نوع دوخت", max_length=200, blank=True)
    country_of_origin = models.CharField("کشور سازنده", max_length=80, blank=True)
    model_height_cm = models.PositiveSmallIntegerField("قد مدل (cm)", null=True, blank=True)
    model_size = models.ForeignKey(Size, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+", verbose_name="سایز لباس مدل")

    price = models.DecimalField("قیمت (تومان)", max_digits=12, decimal_places=0, validators=[MinValueValidator(1)])
    sale_price = models.DecimalField("قیمت با تخفیف", max_digits=12, decimal_places=0, null=True, blank=True,
                                     validators=[MinValueValidator(1)])

    is_active = models.BooleanField("فعال", default=True)
    is_featured = models.BooleanField("منتخب", default=False)
    is_best_seller = models.BooleanField("پرفروش", default=False)
    sales_count = models.PositiveIntegerField("تعداد فروش", default=0)
    views_count = models.PositiveIntegerField("تعداد بازدید", default=0)

    meta_title = models.CharField(max_length=160, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"
        indexes = [
            models.Index(fields=["category", "is_active", "created_at"]),
            models.Index(fields=["gender", "is_active"]),
            models.Index(fields=["is_active", "sales_count"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(sale_price__isnull=True) | models.Q(sale_price__lt=models.F("price")),
                name="product_sale_price_lt_price",
            )
        ]

    def __str__(self):
        return self.name

    def clean(self):
        if self.sale_price is not None and self.price is not None and self.sale_price >= self.price:
            raise ValidationError({"sale_price": "قیمت با تخفیف باید کمتر از قیمت اصلی باشد."})

    @property
    def current_price(self):
        return self.sale_price if self.sale_price is not None else self.price

    @property
    def discount_percent(self):
        if self.sale_price is None or not self.price:
            return 0
        return int(round((self.price - self.sale_price) / self.price * 100))

    @property
    def is_new(self):
        return self.created_at >= timezone.now() - timedelta(days=settings.CATALOG_NEW_DAYS)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    color = models.ForeignKey(Color, null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
                              verbose_name="رنگ مرتبط")
    image = WebPImageField("تصویر", upload_to="products/%Y/%m/", max_side=2000)
    alt = models.CharField("متن جایگزین", max_length=200, blank=True)
    position = models.PositiveIntegerField("ترتیب", default=0)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "تصویر محصول"
        verbose_name_plural = "تصاویر محصول"

    def __str__(self):
        return f"{self.product_id} #{self.position}"


class ProductVariant(models.Model):
    """هر ترکیب رنگ × سایز یک Variant با موجودی مستقل است."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    color = models.ForeignKey(Color, on_delete=models.PROTECT, related_name="variants")
    size = models.ForeignKey(Size, on_delete=models.PROTECT, related_name="variants")
    sku = models.CharField("SKU", max_length=64, unique=True, blank=True)
    price_override = models.DecimalField(
        "قیمت اختصاصی", max_digits=12, decimal_places=0, null=True, blank=True,
        help_text="اگر پر شود، Variant با همین قیمت و بدون تخفیف فروخته می‌شود.",
    )
    cost_price = models.DecimalField(
        "بهای تمام‌شده (تومان)", max_digits=12, decimal_places=0, null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="برای گزارش سود؛ برای هر ترکیب رنگ و سایز ثبت شود.",
    )
    is_active = models.BooleanField("فعال", default=True)

    class Meta:
        verbose_name = "Variant"
        verbose_name_plural = "Variantها"
        constraints = [models.UniqueConstraint(fields=["product", "color", "size"], name="uniq_variant_combo")]
        indexes = [models.Index(fields=["product", "is_active"])]

    def __str__(self):
        return f"{self.product_id} / {self.color} / {self.size}"

    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = f"P{self.product_id}-{self.color.slug}-{self.size.code}".upper()[:64]
        super().save(*args, **kwargs)

    @property
    def current_price(self):
        if self.price_override is not None:
            return self.price_override
        return self.product.current_price


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reviews")
    rating = models.PositiveSmallIntegerField("امتیاز")
    title = models.CharField("عنوان", max_length=120, blank=True)
    body = models.TextField("متن نظر", max_length=2000)
    is_approved = models.BooleanField("تأیید شده", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="uniq_product_review_user"),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="product_review_rating_1_5"),
        ]
        indexes = [models.Index(fields=["product", "is_approved", "-created_at"])]
        verbose_name = "نظر محصول"
        verbose_name_plural = "نظرهای محصول"

    def __str__(self):
        return f"{self.product} · {self.rating}/5"


class ProductQuestion(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="questions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_questions")
    body = models.TextField("پرسش", max_length=1000)
    is_approved = models.BooleanField("تأیید شده", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["product", "is_approved", "-created_at"])]
        verbose_name = "پرسش محصول"
        verbose_name_plural = "پرسش‌های محصول"

    def __str__(self):
        return f"{self.product} · {self.body[:40]}"


class ProductAnswer(models.Model):
    question = models.ForeignKey(ProductQuestion, on_delete=models.CASCADE, related_name="answers")
    body = models.TextField("پاسخ", max_length=2000)
    is_approved = models.BooleanField("تأیید شده", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["question", "is_approved"])]
        verbose_name = "پاسخ پرسش محصول"
        verbose_name_plural = "پاسخ‌های پرسش محصول"

    def __str__(self):
        return f"پاسخ #{self.pk} به پرسش #{self.question_id}"


class Collection(models.Model):
    name = models.CharField("نام", max_length=150)
    slug = models.SlugField("اسلاگ", max_length=170, unique=True, allow_unicode=True)
    description = models.TextField("توضیحات", blank=True)
    cover_image = WebPImageField("تصویر کاور", upload_to="collections/%Y/%m/", blank=True, max_side=2400)
    products = models.ManyToManyField(Product, blank=True, related_name="collections", verbose_name="محصولات")
    is_featured = models.BooleanField("ویژه", default=False)
    is_active = models.BooleanField("فعال", default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]
        verbose_name = "کالکشن"
        verbose_name_plural = "کالکشن‌ها"

    def __str__(self):
        return self.name
