"""
لایه ارسال پیامک. برای اتصال به سرویس واقعی:
۱) کلاسی بسازید که از BaseSMSBackend ارث ببرد و send() را پیاده کند،
۲) مسیر آن را در متغیر محیطی SMS_BACKEND بگذارید.
در Production کلاس‌های Console و Memory مجاز نیستند (config/settings/prod.py).
"""
import logging

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger(__name__)


class BaseSMSBackend:
    def send(self, phone: str, message: str) -> None:
        raise NotImplementedError


class ConsoleSMSBackend(BaseSMSBackend):
    """فقط توسعه: پیام را در لاگ چاپ می‌کند."""

    def send(self, phone, message):
        logger.info("MOCK SMS to %s: %s", phone, message)


class MemorySMSBackend(BaseSMSBackend):
    """فقط تست: پیام‌ها را در حافظه نگه می‌دارد."""

    outbox: list = []

    def send(self, phone, message):
        type(self).outbox.append((phone, message))


def get_sms_backend() -> BaseSMSBackend:
    return import_string(settings.SMS_BACKEND)()
