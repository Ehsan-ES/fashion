import re

from rest_framework.exceptions import ValidationError

_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
PHONE_REGEX = r"^09\d{9}$"


def to_ascii_digits(value) -> str:
    return str(value).translate(_DIGITS)


def normalize_phone(raw) -> str:
    """انواع ورودی موبایل ایران را به قالب 09xxxxxxxxx تبدیل می‌کند."""
    s = re.sub(r"[\s\-()]", "", to_ascii_digits(raw))
    if s.startswith("+98"):
        s = "0" + s[3:]
    elif s.startswith("0098"):
        s = "0" + s[4:]
    elif s.startswith("98") and len(s) == 12:
        s = "0" + s[2:]
    elif s.startswith("9") and len(s) == 10:
        s = "0" + s
    if not re.fullmatch(PHONE_REGEX[1:-1], s):
        raise ValidationError("شماره موبایل معتبر نیست.")
    return s
