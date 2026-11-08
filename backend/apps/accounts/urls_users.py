from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import user_views

router = DefaultRouter()
router.register("addresses", user_views.UserAddressViewSet, basename="address")

urlpatterns = [
    path("me/", user_views.MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
