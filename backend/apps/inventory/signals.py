from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Inventory


@receiver(post_save, sender="catalog.ProductVariant")
def create_inventory_for_variant(sender, instance, created, **kwargs):
    if created:
        Inventory.objects.get_or_create(variant=instance)
