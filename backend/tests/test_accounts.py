import re
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OTPRequest, User, UserAddress
from apps.accounts.sms import MemorySMSBackend
from apps.accounts.validators import normalize_phone
from rest_framework.exceptions import ValidationError

PHONE = "09123456789"
COOKIE = "refresh_token"

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


def last_code():
    return re.search(r"\d{6}", MemorySMSBackend.outbox[-1][1]).group()


def login(api, phone=PHONE):
    assert api.post("/api/auth/otp/request/", {"phone": phone}).status_code == 200
    res = api.post("/api/auth/otp/verify/", {"phone": phone, "code": last_code()})
    assert res.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.json()['access']}")
    return res


# ---------- phone normalization
@pytest.mark.parametrize("raw", ["09123456789", "۰۹۱۲۳۴۵۶۷۸۹", "+989123456789", "989123456789", "9123456789", "0912 345 6789"])
def test_normalize_phone_variants(raw):
    assert normalize_phone(raw) == PHONE


@pytest.mark.parametrize("raw", ["0812345678", "12345", "abc", "09123"])
def test_normalize_phone_invalid(raw):
    with pytest.raises(ValidationError):
        normalize_phone(raw)


# ---------- OTP request
def test_request_otp_sends_sms_and_hides_code(api):
    res = api.post("/api/auth/otp/request/", {"phone": "۰۹۱۲۳۴۵۶۷۸۹"})
    assert res.status_code == 200
    assert "debug_code" not in res.json()
    assert len(MemorySMSBackend.outbox) == 1
    assert MemorySMSBackend.outbox[0][0] == PHONE
    assert OTPRequest.objects.get().code_hash != last_code()  # کد خام ذخیره نمی‌شود


def test_mock_mode_returns_debug_code(api, settings):
    settings.OTP_MOCK_ENABLED = True
    res = api.post("/api/auth/otp/request/", {"phone": PHONE})
    assert res.json()["debug_code"] == last_code()


def test_request_otp_invalid_phone(api):
    res = api.post("/api/auth/otp/request/", {"phone": "123"})
    assert res.status_code == 400
    assert res.json()["error"]["message"]


def test_resend_too_soon(api):
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    OTPRequest.objects.update(created_at=timezone.now())
    from django.core.cache import cache
    cache.clear()  # قفل ۳ثانیه‌ای را کنار بگذار تا محدودیت ۶۰ثانیه‌ای تست شود
    res = api.post("/api/auth/otp/request/", {"phone": PHONE})
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "resend_too_soon"
    assert res["Retry-After"]


def test_hourly_limit(api, settings):
    settings.OTP_RESEND_INTERVAL = 0
    settings.OTP_MAX_PER_HOUR = 2
    from django.core.cache import cache
    for _ in range(2):
        cache.clear()
        assert api.post("/api/auth/otp/request/", {"phone": PHONE}).status_code == 200
    cache.clear()
    res = api.post("/api/auth/otp/request/", {"phone": PHONE})
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "hourly_limit"


# ---------- OTP verify
def test_verify_creates_user_and_sets_cookie(api):
    res = login(api)
    body = res.json()
    assert body["is_new"] is True
    assert body["user"]["phone"] == PHONE
    cookie = res.cookies[COOKIE]
    assert cookie["httponly"]
    assert cookie["path"] == "/api/auth/"
    assert User.objects.filter(phone=PHONE).count() == 1


def test_existing_user_is_not_new(api):
    User.objects.create_user(PHONE)
    assert login(api).json()["is_new"] is False


def test_code_is_single_use(api):
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    code = last_code()
    assert api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": code}).status_code == 200
    assert api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": code}).status_code == 400


def test_wrong_code_attempt_limit(api, settings):
    settings.OTP_MAX_ATTEMPTS = 3
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    good = last_code()
    wrong = "000000" if good != "000000" else "111111"
    for _ in range(2):
        res = api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": wrong})
        assert res.json()["error"]["code"] == "otp_wrong_code"
    res = api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": wrong})
    assert res.json()["error"]["code"] == "otp_attempts_exceeded"
    # حتی کد درست هم دیگر کار نمی‌کند
    assert api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": good}).status_code == 400
    assert not User.objects.filter(phone=PHONE).exists()


def test_expired_code(api):
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    OTPRequest.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    res = api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": last_code()})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "otp_invalid_or_expired"


def test_new_request_invalidates_previous_code(api):
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    first = last_code()
    OTPRequest.objects.update(created_at=timezone.now() - timedelta(minutes=5))
    from django.core.cache import cache
    cache.clear()
    api.post("/api/auth/otp/request/", {"phone": PHONE})
    second = last_code()
    if first != second:
        assert api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": first}).status_code == 400
    assert api.post("/api/auth/otp/verify/", {"phone": PHONE, "code": second}).status_code == 200


# ---------- JWT cookie flow
def test_refresh_rotates_and_blacklists_old(api):
    login(api)
    old = api.cookies[COOKIE].value
    res = api.post("/api/auth/token/refresh/")
    assert res.status_code == 200 and res.json()["access"]
    assert api.cookies[COOKIE].value != old

    attacker = APIClient()
    attacker.cookies[COOKIE] = old
    assert attacker.post("/api/auth/token/refresh/").status_code == 401


def test_refresh_without_cookie(api):
    assert api.post("/api/auth/token/refresh/").status_code == 401


def test_logout_blacklists_and_clears(api):
    login(api)
    old = api.cookies[COOKIE].value
    assert api.post("/api/auth/logout/").status_code == 204
    attacker = APIClient()
    attacker.cookies[COOKIE] = old
    assert attacker.post("/api/auth/token/refresh/").status_code == 401


def test_inactive_user_cannot_refresh(api):
    login(api)
    User.objects.update(is_active=False)
    assert api.post("/api/auth/token/refresh/").status_code == 401


# ---------- me
def test_me_requires_auth(api):
    assert api.get("/api/users/me/").status_code == 401


def test_me_get_and_patch(api):
    login(api)
    assert api.get("/api/users/me/").json()["phone"] == PHONE
    res = api.patch("/api/users/me/", {"first_name": "سارا", "phone": "09000000000"}, format="json")
    assert res.status_code == 200
    assert res.json()["first_name"] == "سارا"
    assert res.json()["phone"] == PHONE  # موبایل از این مسیر قابل تغییر نیست


# ---------- addresses
ADDR = {
    "title": "خانه", "recipient_name": "سارا", "recipient_phone": "09123456789",
    "province": "تهران", "city": "تهران", "address_line": "خیابان ولیعصر، پلاک ۱", "postal_code": "1234567890",
}


def test_address_first_is_default_and_switching(api):
    login(api)
    a = api.post("/api/users/addresses/", ADDR, format="json").json()
    assert a["is_default"] is True
    b = api.post("/api/users/addresses/", {**ADDR, "title": "محل کار", "is_default": True}, format="json").json()
    assert b["is_default"] is True
    assert UserAddress.objects.get(pk=a["id"]).is_default is False
    assert UserAddress.objects.filter(is_default=True).count() == 1


def test_delete_default_promotes_another(api):
    login(api)
    a = api.post("/api/users/addresses/", ADDR, format="json").json()
    b = api.post("/api/users/addresses/", {**ADDR, "title": "دوم"}, format="json").json()
    assert api.delete(f"/api/users/addresses/{a['id']}/").status_code == 204
    assert UserAddress.objects.get(pk=b["id"]).is_default is True


def test_cannot_unset_only_default(api):
    login(api)
    a = api.post("/api/users/addresses/", ADDR, format="json").json()
    res = api.patch(f"/api/users/addresses/{a['id']}/", {"is_default": False}, format="json")
    assert res.json()["is_default"] is True


def test_addresses_are_private_per_user(api):
    login(api)
    a = api.post("/api/users/addresses/", ADDR, format="json").json()
    other = APIClient()
    login(other, "09351112233")
    assert other.get(f"/api/users/addresses/{a['id']}/").status_code == 404
    assert other.get("/api/users/addresses/").json() == []


def test_address_validation_and_limit(api):
    login(api)
    assert api.post("/api/users/addresses/", {**ADDR, "postal_code": "123"}, format="json").status_code == 400
    for i in range(10):
        assert api.post("/api/users/addresses/", {**ADDR, "title": f"a{i}"}, format="json").status_code == 201
    assert api.post("/api/users/addresses/", ADDR, format="json").status_code == 400
