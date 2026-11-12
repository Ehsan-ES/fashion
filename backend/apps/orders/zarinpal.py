import json
import logging
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)


class ZarinpalError(Exception):
    def __init__(self, message, *, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain


def _api_url(path):
    host = "https://sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "https://api.zarinpal.com"
    return f"{host}/pg/v4/payment/{path}.json"


def _post(path, payload, expected_codes=(100,)):
    request = Request(
        _api_url(path),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Zarinpal %s request failed: %s", path, type(exc).__name__)
        raise ZarinpalError("ارتباط با درگاه زرین‌پال برقرار نشد.", uncertain=True) from exc

    if not isinstance(body, dict):
        logger.warning("Zarinpal %s returned a non-object response.", path)
        raise ZarinpalError("پاسخ درگاه زرین‌پال معتبر نیست.")
    data = body.get("data") or {}
    errors = body.get("errors") or {}
    if not isinstance(data, dict) or not isinstance(errors, (dict, list)):
        logger.warning("Zarinpal %s returned an invalid response structure.", path)
        raise ZarinpalError("پاسخ درگاه زرین‌پال معتبر نیست.")
    code = data.get("code")
    if not isinstance(code, int):
        logger.warning("Zarinpal %s returned an invalid response.", path)
        raise ZarinpalError("پاسخ درگاه زرین‌پال معتبر نیست.")
    if code not in expected_codes:
        logger.info("Zarinpal %s rejected request with code %s: %s", path, code, errors)
        raise ZarinpalError("درگاه زرین‌پال درخواست را نپذیرفت.")
    return data


def request_payment(*, amount_rial, description, callback_url, mobile, email=""):
    data = _post("request", {
        "merchant_id": settings.ZARINPAL_MERCHANT_ID,
        "amount": amount_rial,
        "description": description[:500],
        "callback_url": callback_url,
        "metadata": {"mobile": mobile, "email": email} if email else {"mobile": mobile},
    })
    authority = data.get("authority")
    if not isinstance(authority, str) or not authority:
        raise ZarinpalError("درگاه شناسه پرداخت معتبر برنگرداند.")
    host = "https://sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "https://www.zarinpal.com"
    return authority, f"{host}/pg/StartPay/{authority}"


def verify_payment(*, authority, amount_rial):
    data = _post("verify", {
        "merchant_id": settings.ZARINPAL_MERCHANT_ID,
        "amount": amount_rial,
        "authority": authority,
    }, expected_codes=(100, 101))
    ref_id = data.get("ref_id")
    if ref_id is None:
        raise ZarinpalError("درگاه شماره پیگیری پرداخت را برنگرداند.")
    return str(ref_id), data.get("code")
