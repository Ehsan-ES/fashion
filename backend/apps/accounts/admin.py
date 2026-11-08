from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm as DjangoUserChangeForm

from .models import OTPRequest, User, UserAddress


class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="رمز عبور", widget=forms.PasswordInput, required=False)
    password2 = forms.CharField(label="تکرار رمز عبور", widget=forms.PasswordInput, required=False)

    class Meta:
        model = User
        fields = ("phone",)

    def clean_password2(self):
        p1, p2 = self.cleaned_data.get("password1"), self.cleaned_data.get("password2")
        if p1 != p2:
            raise forms.ValidationError("رمزها یکسان نیستند.")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        pw = self.cleaned_data.get("password1")
        user.set_password(pw) if pw else user.set_unusable_password()
        if commit:
            user.save()
        return user


class UserChangeForm(DjangoUserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    ordering = ("-date_joined",)
    list_display = ("phone", "first_name", "last_name", "is_staff", "is_active", "date_joined")
    search_fields = ("phone", "first_name", "last_name", "email")
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("اطلاعات شخصی", {"fields": ("first_name", "last_name", "email", "personalization_enabled")}),
        ("دسترسی‌ها", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("تاریخ‌ها", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("phone", "password1", "password2")}),)


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "city", "is_default")
    search_fields = ("user__phone", "recipient_name", "city")


@admin.register(OTPRequest)
class OTPRequestAdmin(admin.ModelAdmin):
    list_display = ("phone", "created_at", "attempts", "consumed_at")
    readonly_fields = [f.name for f in OTPRequest._meta.fields]
    search_fields = ("phone",)
