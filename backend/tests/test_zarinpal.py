import io
import json
from unittest.mock import patch

import pytest
from django.test import override_settings

from apps.orders.zarinpal import ZarinpalError, request_payment, verify_payment

def response(payload):
    return io.BytesIO(json.dumps(payload).encode("utf-8"))


@override_settings(
    ZARINPAL_SANDBOX=True,
    ZARINPAL_MERCHANT_ID="test-merchant",
)
def test_payment_request_uses_v4_sandbox_endpoint_and_rial_amount():
    with patch(
        "apps.orders.zarinpal.urlopen",
        return_value=response({"data": {"code": 100, "authority": "A-test-authority"}, "errors": []}),
    ) as urlopen_mock:
        authority, payment_url = request_payment(
            amount_rial=29_700_000,
            description="Order test",
            callback_url="https://shop.example/api/payments/zarinpal/callback/",
            mobile="09123456789",
        )

    request = urlopen_mock.call_args.args[0]
    payload = json.loads(request.data)
    assert request.full_url == "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    assert request.get_method() == "POST"
    assert payload["merchant_id"] == "test-merchant"
    assert payload["amount"] == 29_700_000
    assert payload["callback_url"] == "https://shop.example/api/payments/zarinpal/callback/"
    assert authority == "A-test-authority"
    assert payment_url.endswith("/pg/StartPay/A-test-authority")


@override_settings(
    ZARINPAL_SANDBOX=False,
    ZARINPAL_MERCHANT_ID="test-merchant",
)
def test_verification_uses_production_endpoint_and_accepts_already_verified_code():
    with patch(
        "apps.orders.zarinpal.urlopen",
        return_value=response({"data": {"code": 101, "ref_id": 123456789}, "errors": []}),
    ) as urlopen_mock:
        ref_id, code = verify_payment(authority="A-test-authority", amount_rial=12_345_000)

    request = urlopen_mock.call_args.args[0]
    payload = json.loads(request.data)
    assert request.full_url == "https://api.zarinpal.com/pg/v4/payment/verify.json"
    assert payload["authority"] == "A-test-authority"
    assert payload["amount"] == 12_345_000
    assert ref_id == "123456789"
    assert code == 101


@override_settings(
    ZARINPAL_SANDBOX=True,
    ZARINPAL_MERCHANT_ID="test-merchant",
)
@pytest.mark.parametrize("body", [b"not-json", b"[]", b'{"data":[],"errors":[]}'])
def test_invalid_gateway_responses_raise_a_clear_gateway_error(body):
    with patch("apps.orders.zarinpal.urlopen", return_value=io.BytesIO(body)):
        with pytest.raises(ZarinpalError):
            request_payment(
                amount_rial=1000,
                description="Order test",
                callback_url="https://shop.example/callback",
                mobile="09123456789",
            )
