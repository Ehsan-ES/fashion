from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .otp import request_otp, verify_otp
from .serializers import OTPRequestSerializer, OTPVerifySerializer, UserSerializer

User = get_user_model()


def _client_ip(request):
    return request.META.get("REMOTE_ADDR")


class OTPRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(request=OTPRequestSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        s = OTPRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        _, code = request_otp(s.validated_data["phone"], ip=_client_ip(request))
        data = {"expires_in": settings.OTP_TTL_SECONDS, "resend_after": settings.OTP_RESEND_INTERVAL}
        if settings.OTP_MOCK_ENABLED:  # فقط توسعه؛ در prod امکان فعال شدن ندارد
            data["debug_code"] = code
        return Response(data)


class OTPVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    @extend_schema(request=OTPVerifySerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        s = OTPVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        phone = s.validated_data["phone"]
        verify_otp(phone, s.validated_data["code"])

        user, created = User.objects.get_or_create(phone=phone)
        if not user.is_active:
            return Response({"detail": "حساب شما غیرفعال است."}, status=status.HTTP_403_FORBIDDEN)
        update_last_login(None, user)

        refresh = RefreshToken.for_user(user)
        response = Response({
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
            "is_new": created,
        })
        set_refresh_cookie(response, refresh)
        return response


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=None, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        failure = Response({"detail": "نشست منقضی شده است. دوباره وارد شوید."}, status=status.HTTP_401_UNAUTHORIZED)
        if not raw:
            return failure
        try:
            old = RefreshToken(raw)  # امضا، انقضا و Blacklist را بررسی می‌کند
            user = User.objects.filter(pk=old["user_id"], is_active=True).first()
            if user is None:
                raise TokenError("user not found")
            old.blacklist()  # چرخش توکن: هر Refresh فقط یک‌بار قابل استفاده است
        except TokenError:
            clear_refresh_cookie(failure)
            return failure

        new = RefreshToken.for_user(user)
        response = Response({"access": str(new.access_token)})
        set_refresh_cookie(response, new)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response
