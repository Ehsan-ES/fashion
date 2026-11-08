from django.db import models

from .images import to_webp


class WebPImageField(models.ImageField):
    """ImageField که فایل جدید را هنگام ذخیره به WebP تبدیل و کوچک می‌کند."""

    def __init__(self, *args, max_side=2000, **kwargs):
        self.max_side = max_side
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.max_side != 2000:
            kwargs["max_side"] = self.max_side
        return name, path, args, kwargs

    def pre_save(self, model_instance, add):
        file = getattr(model_instance, self.attname)
        if file and not file._committed:
            content = to_webp(file.file, file.name, self.max_side)
            file.save(content.name, content, save=False)
        return super().pre_save(model_instance, add)
