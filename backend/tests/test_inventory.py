import pytest

from apps.inventory import services
from apps.inventory.models import Inventory

from .factories import make_product

pytestmark = pytest.mark.django_db


def inv(stock=5):
    p = make_product(variants=(("black", "M", stock),))
    return p.variants.get().inventory


def test_available_property():
    i = inv(5)
    i.reserved = 2
    assert i.available == 3


def test_reserve_and_release():
    i = inv(5)
    services.reserve(i.variant_id, 3)
    i.refresh_from_db()
    assert (i.quantity, i.reserved, i.available) == (5, 3, 2)
    services.release(i.variant_id, 2)
    i.refresh_from_db()
    assert i.reserved == 1


def test_reserve_more_than_available_fails():
    i = inv(2)
    with pytest.raises(services.InsufficientStock):
        services.reserve(i.variant_id, 3)
    i.refresh_from_db()
    assert i.reserved == 0


def test_reserve_respects_existing_reservations():
    i = inv(3)
    services.reserve(i.variant_id, 2)
    with pytest.raises(services.InsufficientStock):
        services.reserve(i.variant_id, 2)


def test_commit_reduces_quantity_and_reservation():
    i = inv(5)
    services.reserve(i.variant_id, 2)
    services.commit(i.variant_id, 2)
    i.refresh_from_db()
    assert (i.quantity, i.reserved) == (3, 0)


def test_commit_without_reservation_fails():
    i = inv(5)
    with pytest.raises(services.InsufficientStock):
        services.commit(i.variant_id, 1)


def test_non_positive_quantity_rejected():
    i = inv(5)
    for fn in (services.reserve, services.release, services.commit):
        with pytest.raises(ValueError):
            fn(i.variant_id, 0)


def test_inventory_row_created_once_per_variant():
    p = make_product(variants=(("black", "M", 1),))
    assert Inventory.objects.filter(variant__product=p).count() == 1
