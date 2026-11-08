import hashlib
import hmac
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import OTPRequest
from .sms import get_sms_backend


class OTPError(APIException):
    status_code = 400

    def __init__(self, code, message, status_code=400, retry_after=None):
        super().__init__(detail=message, code=code)
        self.status_code = status_code
        self.retry_after = retry_after


def _hash(phone: str, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def request_otp(phone: str, ip: str | None = None):
    """کد جدید می‌سازد و می‌فرستد. خروجی: (OTPRequest, code)."""
    now = timezone.now()

    # قفل کوتاه برای جلوگیری از درخواست‌های هم‌زمان
    if not cache.add(f"otp:lock:{phone}", 1, timeout=3):
        raise OTPError("resend_too_soon", "لطفاً چند ثانیه صبر کنید.", 429, retry_after=3)

    last = OTPRequest.objects.filter(phone=phone).order_by("-created_at").first()
    if last:
        elapsed = (now - last.created_at).total_seconds()
        if elapsed < settings.OTP_RESEND_INTERVAL:
            wait = math.ceil(settings.OTP_RESEND_INTERVAL - elapsed)
            raise OTPError("resend_too_soon", f"{wait} ثانیه دیگر می‌توانید کد جدید بگیرید.", 429, retry_after=wait)

    recent = OTPRequest.objects.filter(phone=phone, created_at__gte=now - timedelta(hours=1)).count()
    if recent >= settings.OTP_MAX_PER_HOUR:
        raise OTPError("hourly_limit", "تعداد درخواست‌های شما بیش از حد مجاز است. بعداً تلاش کنید.", 429, retry_after=3600)

    code = str(secrets.randbelow(10 ** settings.OTP_LENGTH)).zfill(settings.OTP_LENGTH)
    with transaction.atomic():
        OTPRequest.objects.filter(phone=phone, consumed_at__isnull=True).update(consumed_at=now)
        otp = OTPRequest.objects.create(
            phone=phone,
            code_hash=_hash(phone, code),
            expires_at=now + timedelta(seconds=settings.OTP_TTL_SECONDS),
            ip=ip,
        )
    minutes = max(1, settings.OTP_TTL_SECONDS // 60)
    get_sms_backend().send(phone, f"کد ورود شما: {code}\nاعتبار: {minutes} دقیقه")
    return otp, code


def verify_otp(phone: str, code: str) -> None:
    """در صورت نامعتبر بودن OTPError می‌دهد. خطا بیرون از transaction پرتاب می‌شود تا شمارنده تلاش ذخیره بماند."""
    now = timezone.now()
    error = None
    with transaction.atomic():
        otp = (
            OTPRequest.objects.select_for_update()
            .filter(phone=phone, consumed_at__isnull=True, expires_at__gt=now)
            .order_by("-created_at")
            .first()
        )
        if otp is None:
            error = OTPError("otp_invalid_or_expired", "کد نامعتبر است یا منقضی شده. کد جدید دریافت کنید.")
        elif not hmac.compare_digest(otp.code_hash, _hash(phone, code)):
            otp.attempts += 1
            remaining = settings.OTP_MAX_ATTEMPTS - otp.attempts
            if remaining <= 0:
                otp.consumed_at = now
                error = OTPError("otp_attempts_exceeded", "تعداد تلاش‌ها تمام شد. کد جدید دریافت کنید.", 429)
            else:
                error = OTPError("otp_wrong_code", f"کد وارد شده صحیح نیست. {remaining} تلاش باقی مانده.")
            otp.save(update_fields=["attempts", "consumed_at"])
        else:
            otp.consumed_at = now
            otp.save(update_fields=["consumed_at"])
    if error:
        raise error
