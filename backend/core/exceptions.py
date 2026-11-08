from rest_framework.views import exception_handler


def _first_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        for value in data.values():
            msg = _first_message(value)
            if msg:
                return msg
    elif isinstance(data, (list, tuple)):
        for value in data:
            msg = _first_message(value)
            if msg:
                return msg
    elif data:
        return str(data)
    return None


def api_exception_handler(exc, context):
    """فرمت یکسان خطا: {"error": {"code", "message", "details", "retry_after"?}}"""
    response = exception_handler(exc, context)
    if response is None:
        return None

    codes = exc.get_codes() if hasattr(exc, "get_codes") else None
    code = codes if isinstance(codes, str) else getattr(exc, "default_code", "error")
    error = {
        "code": code,
        "message": _first_message(response.data) or "درخواست نامعتبر است.",
        "details": response.data,
    }
    retry_after = getattr(exc, "retry_after", None) or getattr(exc, "wait", None)
    if retry_after:
        error["retry_after"] = int(retry_after)
        response["Retry-After"] = str(int(retry_after))
    response.data = {"error": error}
    return response
