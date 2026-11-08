from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa

DEBUG = False
if OTP_MOCK_ENABLED:  # noqa: F405
    raise ImproperlyConfigured("OTP_MOCK_ENABLED must be False in production.")

if SMS_BACKEND in (  # noqa: F405
    "apps.accounts.sms.ConsoleSMSBackend",
    "apps.accounts.sms.MemorySMSBackend",
):
    raise ImproperlyConfigured("A real SMS backend is required in production.")

REFRESH_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
