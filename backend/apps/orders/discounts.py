from dataclasses import dataclass


@dataclass(frozen=True)
class Coupon:
    percent: int
    minimum: int = 0


COUPONS = {
    "WELCOME10": Coupon(percent=10),
    "STYLE15": Coupon(percent=15, minimum=5_000_000),
}


def coupon_discount(code: str, subtotal: int) -> int:
    coupon = COUPONS.get(code)
    if coupon is None:
        raise ValueError("کد تخفیف معتبر نیست.")
    if subtotal < coupon.minimum:
        raise ValueError(f"برای این کد، مبلغ سبد باید حداقل {coupon.minimum:,} تومان باشد.")
    return subtotal * coupon.percent // 100
