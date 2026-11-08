import importlib
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured


def _import_prod():
    # base را هم دوباره بخوان تا متغیرهای محیطی تازه اعمال شوند
    sys.modules.pop("config.settings.base", None)
    sys.modules.pop("config.settings.prod", None)
    return importlib.import_module("config.settings.prod")


def test_prod_rejects_mock_otp(monkeypatch):
    monkeypatch.setenv("OTP_MOCK_ENABLED", "True")
    with pytest.raises(ImproperlyConfigured, match="OTP_MOCK_ENABLED"):
        _import_prod()


def test_prod_rejects_console_sms_backend(monkeypatch):
    monkeypatch.setenv("OTP_MOCK_ENABLED", "False")
    monkeypatch.setenv("SMS_BACKEND", "apps.accounts.sms.ConsoleSMSBackend")
    with pytest.raises(ImproperlyConfigured, match="SMS backend"):
        _import_prod()
