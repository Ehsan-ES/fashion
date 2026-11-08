import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_endpoint_ok(client, settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    res = client.get(reverse("health"))
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_unknown_api_route_is_404(client):
    assert client.get("/api/does-not-exist/").status_code == 404
