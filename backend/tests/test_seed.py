from io import BytesIO

import pytest
from django.core.management import call_command
from PIL import Image

from apps.catalog.management.commands.seed_catalog import PRODUCTS, placeholder_image
from apps.catalog.models import Category, Collection, Product, ProductImage, ProductVariant
from apps.inventory.models import Inventory

pytestmark = pytest.mark.django_db


def test_seed_creates_catalog_and_is_idempotent():
    call_command("seed_catalog", "--no-images")
    assert Product.objects.count() == len(PRODUCTS)
    variants = ProductVariant.objects.count()
    assert variants > len(PRODUCTS)
    assert Inventory.objects.count() == variants
    call_command("seed_catalog", "--no-images")
    assert Product.objects.count() == len(PRODUCTS)
    assert ProductVariant.objects.count() == variants


def test_seed_with_images_for_one_run(settings):
    call_command("seed_catalog", "--seed", "1")
    assert ProductImage.objects.count() >= len(PRODUCTS)
    assert all(i.image.name.endswith(".webp") for i in ProductImage.objects.all()[:5])
    assert Category.objects.exclude(image="").count() == Category.objects.count()
    assert Collection.objects.exclude(cover_image="").count() == Collection.objects.count()


def test_seed_reset():
    call_command("seed_catalog", "--no-images")
    call_command("seed_catalog", "--no-images", "--reset")
    assert Product.objects.count() == len(PRODUCTS)


def test_placeholder_image_is_webp():
    data = placeholder_image("test", "#B69B70", angle=1, size=(200, 260))
    img = Image.open(BytesIO(data))
    assert img.format == "WEBP" and img.size == (200, 260)
