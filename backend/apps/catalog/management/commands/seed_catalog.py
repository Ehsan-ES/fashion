import random
from datetime import timedelta
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps

from apps.catalog.models import (
    Brand, Category, Collection, Color, Product, ProductImage, ProductVariant, Size,
)
from apps.inventory.models import Inventory

COLORS = [
    ("مشکی", "black", "#111111"), ("سفید", "white", "#F5F3EE"), ("بژ", "beige", "#D8C9B5"),
    ("خاکستری", "gray", "#8E8E8E"), ("سرمه‌ای", "navy", "#1F2A44"), ("زیتونی", "olive", "#6B6B3A"),
    ("قهوه‌ای", "brown", "#6A4B35"), ("شرابی", "wine", "#6D1F2F"), ("کرم", "cream", "#EFE6D2"),
    ("طلایی", "gold", "#B69B70"),
]
APPAREL = ["XS", "S", "M", "L", "XL"]
SHOES = ["39", "40", "41", "42", "43"]
CATEGORIES = [
    ("shirt", "پیراهن"), ("pants", "شلوار"), ("coat", "کت و مانتو"), ("tshirt", "تیشرت"),
    ("shoes", "کفش"), ("bags", "کیف"), ("accessories", "اکسسوری"),
    ("sportswear", "لباس ورزشی"), ("formal", "لباس مجلسی"),
]
BRANDS = [("maison-noor", "Maison Noor"), ("atelier-sahar", "Atelier Sahar"),
          ("nord-co", "Nord & Co"), ("loom-studio", "Loom Studio")]
COLLECTIONS = [
    ("spring-edit", "کالکشن بهاره", "رنگ‌های روشن و پارچه‌های سبک برای روزهای گرم.", True),
    ("essentials", "اساسی‌ها", "تکه‌های ساده و ماندگار برای هر کمد لباس.", True),
    ("evening", "شب و مهمانی", "انتخاب‌هایی برای شب‌های خاص.", False),
]
MATERIALS = {
    "shirt": "کتان ۱۰۰٪", "pants": "مخلوط پنبه و الیاف الاستیک", "coat": "پشم مخلوط", "tshirt": "پنبه ۱۰۰٪",
    "shoes": "چرم طبیعی", "bags": "چرم طبیعی", "accessories": "فلز با روکش طلایی",
    "sportswear": "پلی‌استر تنفس‌پذیر", "formal": "کرپ و ساتن",
}
CONSTRUCTIONS = {
    "shirt": "دوخت دو‌سوزنه", "pants": "کمر کشی", "coat": "آستردوزی کامل", "tshirt": "دوخت تخت",
    "shoes": "دست‌دوز", "bags": "دست‌دوز", "accessories": "ریخته‌گری", "sportswear": "درز فلت‌لاک",
    "formal": "آستردوزی و ظریف‌دوزی",
}
COUNTRIES = ["ایران", "ترکیه", "ایتالیا", "پرتغال"]

# (دسته، جنسیت، نام، اسلاگ، قیمت تومان، درصد تخفیف، برند، پرچم‌ها: f=منتخب b=پرفروش)
PRODUCTS = [
    ("shirt", "women", "پیراهن کتان یقه ایستاده", "linen-stand-collar-shirt", 2450000, None, "maison-noor", "f"),
    ("shirt", "men", "پیراهن آکسفورد کلاسیک", "classic-oxford-shirt", 2190000, 15, "nord-co", "b"),
    ("pants", "women", "شلوار پارچه‌ای راسته", "straight-tailored-trousers", 2890000, None, "atelier-sahar", "fb"),
    ("pants", "men", "شلوار چینو", "slim-chino-pants", 2390000, 20, "nord-co", ""),
    ("pants", "unisex", "شلوار کارگو نرم", "soft-cargo-pants", 2650000, None, "loom-studio", ""),
    ("coat", "women", "مانتو بلند کتان", "long-linen-coat", 4950000, None, "maison-noor", "f"),
    ("coat", "men", "کت تک پشمی", "wool-blend-blazer", 6900000, 10, "atelier-sahar", "fb"),
    ("coat", "women", "کت اورسایز", "oversized-blazer", 5350000, None, "atelier-sahar", ""),
    ("tshirt", "women", "تیشرت پنبه‌ای ساده", "basic-cotton-tee-w", 790000, None, "loom-studio", "b"),
    ("tshirt", "men", "تیشرت یقه گرد", "crew-neck-tee-m", 790000, 25, "loom-studio", "b"),
    ("tshirt", "unisex", "تیشرت اورسایز چاپی", "oversized-graphic-tee", 990000, None, "loom-studio", ""),
    ("shoes", "women", "کفش چرم مینیمال", "minimal-leather-shoes-w", 4200000, None, "maison-noor", "f"),
    ("shoes", "men", "کفش اکسفورد", "oxford-leather-shoes", 5200000, 12, "nord-co", ""),
    ("shoes", "unisex", "کتانی سفید", "white-sneakers", 3450000, None, "loom-studio", "b"),
    ("bags", "women", "کیف دوشی چرم", "leather-shoulder-bag", 5800000, None, "maison-noor", "fb"),
    ("bags", "men", "کیف دستی چرم", "leather-briefcase", 6400000, 15, "nord-co", ""),
    ("accessories", "women", "گردنبند طلایی مات", "matte-gold-necklace", 1450000, None, "atelier-sahar", "f"),
    ("accessories", "men", "کمربند چرم", "classic-leather-belt", 1250000, None, "nord-co", ""),
    ("sportswear", "women", "ست ورزشی تنفس‌پذیر", "breathable-sport-set", 2150000, 18, "loom-studio", ""),
    ("sportswear", "men", "شلوارک ورزشی", "training-shorts", 990000, None, "loom-studio", ""),
    ("formal", "women", "پیراهن مجلسی ساتن", "satin-evening-dress", 7800000, None, "atelier-sahar", "fb"),
    ("formal", "men", "کت و شلوار دو‌تکه", "two-piece-suit", 12900000, 10, "nord-co", "f"),
]
COLLECTION_MAP = {
    "spring-edit": {"shirt", "tshirt", "pants"},
    "essentials": {"tshirt", "pants", "shoes"},
    "evening": {"formal", "bags", "accessories"},
}


def placeholder_image(label: str, hex_color: str, angle: int = 0, size=(800, 1066)) -> bytes:
    """تصویر Placeholder مینیمال (گرادیان رنگ محصول) به‌صورت WebP؛ تا زمان جایگزینی با عکس واقعی."""
    r, g, b = ImageColor.getrgb(hex_color)
    light = tuple(min(255, int(c + (255 - c) * 0.55)) for c in (r, g, b))
    dark = tuple(int(c * 0.6) for c in (r, g, b))
    grad = Image.linear_gradient("L")
    if angle % 2:
        grad = grad.rotate(90)
    grad = grad.resize(size)
    img = ImageOps.colorize(grad, black=dark, white=light)
    draw = ImageDraw.Draw(img)
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    ink = (17, 17, 17) if luminance > 140 else (248, 246, 242)
    font = ImageFont.load_default(size=40)
    small = ImageFont.load_default(size=26)
    text = label.upper()
    w = draw.textlength(text, font=font)
    draw.text(((size[0] - w) / 2, size[1] / 2 - 30), text, fill=ink, font=font)
    cap = f"VIEW {angle + 1}"
    w2 = draw.textlength(cap, font=small)
    draw.text(((size[0] - w2) / 2, size[1] / 2 + 30), cap, fill=ink, font=small)
    draw.rectangle([24, 24, size[0] - 24, size[1] - 24], outline=ink, width=2)
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=78)
    return buf.getvalue()


class Command(BaseCommand):
    help = "داده نمونه کاتالوگ (دسته، برند، رنگ، سایز، محصول، Variant، موجودی و تصاویر Placeholder)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="ابتدا همه داده کاتالوگ را پاک می‌کند.")
        parser.add_argument("--no-images", action="store_true", help="بدون ساخت تصویر (سریع‌تر).")
        parser.add_argument("--seed", type=int, default=7, help="برای نتیجه تکرارپذیر.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts["reset"]:
            Product.objects.all().delete()
            Collection.objects.all().delete()
            Category.objects.all().delete()
            Brand.objects.all().delete()
            Color.objects.all().delete()
            Size.objects.all().delete()
            self.stdout.write("داده‌های قبلی پاک شد.")

        colors = {s: Color.objects.update_or_create(slug=s, defaults={"name": n, "hex_code": h})[0]
                  for n, s, h in COLORS}
        sizes = {}
        for i, code in enumerate(APPAREL):
            sizes[code] = Size.objects.update_or_create(code=code, defaults={"group": "apparel", "sort_order": i})[0]
        for i, code in enumerate(SHOES):
            sizes[code] = Size.objects.update_or_create(code=code, defaults={"group": "shoe", "sort_order": i})[0]
        sizes["FREE"] = Size.objects.update_or_create(
            code="FREE", defaults={"group": "one", "name": "فری‌سایز", "sort_order": 0})[0]

        cats = {s: Category.objects.update_or_create(slug=s, defaults={"name": n, "sort_order": i})[0]
                for i, (s, n) in enumerate(CATEGORIES)}
        brands = {s: Brand.objects.update_or_create(slug=s, defaults={"name": n})[0] for s, n in BRANDS}
        collections = {
            s: Collection.objects.update_or_create(
                slug=s, defaults={"name": n, "description": d, "is_featured": f, "sort_order": i})[0]
            for i, (s, n, d, f) in enumerate(COLLECTIONS)
        }

        if not opts["no_images"]:
            # تصویر Placeholder برای دسته‌ها و کالکشن‌ها (Mega Menu و کارت‌های کالکشن)
            hexes = [h for _, _, h in COLORS]
            for i, category in enumerate(cats.values()):
                if not category.image:
                    data = placeholder_image(category.slug, hexes[(i * 3) % len(hexes)], i, size=(600, 800))
                    category.image.save(f"{category.slug}.webp", ContentFile(data), save=True)
            for i, collection in enumerate(collections.values()):
                if not collection.cover_image:
                    data = placeholder_image(collection.slug.replace("-", " "), hexes[(i * 4 + 2) % len(hexes)], i,
                                             size=(1200, 800))
                    collection.cover_image.save(f"{collection.slug}.webp", ContentFile(data), save=True)

        created = 0
        for cat, gender, name, slug, price, pct, brand, flags in PRODUCTS:
            prng = random.Random(f"{opts['seed']}-{slug}")  # تکرارپذیر و مستقل از اجراهای قبلی
            country = prng.choice(COUNTRIES)
            sales_count = prng.randint(0, 250)
            views_count = prng.randint(20, 3000)
            age_days = prng.randint(0, 90)
            palette = prng.sample(list(colors.values()), prng.choice([2, 3]))
            sale = int(round(price * (100 - pct) / 100, -3)) if pct else None
            product, was_created = Product.objects.get_or_create(
                slug=slug,
                defaults=dict(
                    name=name, category=cats[cat], brand=brands[brand], gender=gender,
                    price=price, sale_price=sale,
                    description=f"{name}؛ دوخت دقیق و پارچه باکیفیت برای استایل روزمره و مجلسی.",
                    material=MATERIALS[cat], construction=CONSTRUCTIONS[cat],
                    country_of_origin=country,
                    model_height_cm=175 if cat not in ("bags", "accessories") else None,
                    model_size=sizes["M"] if cat in ("shirt", "pants", "coat", "tshirt", "sportswear", "formal") else None,
                    is_featured="f" in flags, is_best_seller="b" in flags,
                    sales_count=sales_count, views_count=views_count,
                ),
            )
            if was_created:
                created += 1
                # پراکندگی تاریخ تا نشان New و مرتب‌سازی جدیدترین قابل تست باشد
                Product.objects.filter(pk=product.pk).update(
                    created_at=timezone.now() - timedelta(days=age_days))

            size_codes = SHOES if cat == "shoes" else ["FREE"] if cat in ("bags", "accessories") else APPAREL
            for color in palette:
                for code in size_codes:
                    variant, v_created = ProductVariant.objects.get_or_create(
                        product=product, color=color, size=sizes[code])
                    if v_created:
                        qty = 0 if prng.random() < 0.12 else prng.randint(1, 15)
                        Inventory.objects.update_or_create(variant=variant, defaults={"quantity": qty})

            if not opts["no_images"] and not product.images.exists():
                pos = 0
                for color in palette[:2]:
                    for angle in range(2):
                        data = placeholder_image(slug.replace("-", " "), color.hex_code, angle)
                        ProductImage.objects.create(
                            product=product, color=color, position=pos,
                            alt=f"{name} - {color.name}",
                            image=ContentFile(data, name=f"{slug}-{color.slug}-{angle + 1}.webp"),
                        )
                        pos += 1

            for col_slug, cat_set in COLLECTION_MAP.items():
                if cat in cat_set:
                    collections[col_slug].products.add(product)

        self.stdout.write(self.style.SUCCESS(
            f"انجام شد: {Product.objects.count()} محصول ({created} جدید)، "
            f"{ProductVariant.objects.count()} Variant، {ProductImage.objects.count()} تصویر."
        ))
