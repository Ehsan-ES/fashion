from django.urls import path

from . import auth_views

urlpatterns = [
    path("otp/request/", auth_views.OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", auth_views.OTPVerifyView.as_view(), name="otp-verify"),
    path("token/refresh/", auth_views.TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
]
