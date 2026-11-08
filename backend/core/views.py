from django.core.cache import cache
from django.db import connection
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response


@api_view(["GET"])
@throttle_classes([])
def health(request):
    status = {"database": "ok", "cache": "ok"}
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception:
        status["database"] = "error"
    try:
        cache.set("health", "1", 5)
        if cache.get("health") != "1":
            raise RuntimeError
    except Exception:
        status["cache"] = "error"
    ok = all(v == "ok" for v in status.values())
    return Response({"status": "ok" if ok else "degraded", **status},
                    status=200 if ok else 503)
