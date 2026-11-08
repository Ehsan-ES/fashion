from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps


def to_webp(fileobj, filename="image", max_side=2000, quality=82) -> ContentFile:
    """هر تصویر آپلودشده را (با اصلاح چرخش EXIF و محدود کردن ابعاد) به WebP تبدیل می‌کند."""
    if hasattr(fileobj, "seek"):
        fileobj.seek(0)
    img = Image.open(fileobj)
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=4)
    stem = Path(str(filename)).stem or "image"
    return ContentFile(buf.getvalue(), name=f"{stem}.webp")
