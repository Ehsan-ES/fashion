import pytest
from django.core.cache import cache

from apps.accounts.sms import MemorySMSBackend


@pytest.fixture(autouse=True)
def _isolated_env(settings, tmp_path):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    settings.SMS_BACKEND = "apps.accounts.sms.MemorySMSBackend"
    settings.OTP_MOCK_ENABLED = False
    settings.MEDIA_ROOT = str(tmp_path / "media")
    cache.clear()
    MemorySMSBackend.outbox.clear()
    yield
    cache.clear()
