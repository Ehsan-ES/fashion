import { formatNumber } from "../../shared/utils/format";

export const COUPONS = {
  WELCOME10: { percent: 10, minimum: 0 },
  STYLE15: { percent: 15, minimum: 5_000_000 },
};

export function getCouponDiscount(code, subtotal) {
  const normalizedCode = String(code).trim().toUpperCase();
  const coupon = COUPONS[normalizedCode];

  if (!coupon) {
    return { valid: false, discount: 0, message: "کد تخفیف معتبر نیست." };
  }
  if (subtotal < coupon.minimum) {
    return {
      valid: false,
      discount: 0,
      message: `برای این کد، مبلغ سبد باید حداقل ${coupon.minimum.toLocaleString("fa-IR")} تومان باشد.`,
    };
  }

  return {
    valid: true,
    discount: Math.floor((subtotal * coupon.percent) / 100),
    message: `${formatNumber(coupon.percent)}٪ تخفیف با موفقیت اعمال شد.`,
  };
}

export function getCartTotals(items, couponCode = "") {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const productSavings = items.reduce(
    (sum, item) => sum + Math.max(0, item.originalPrice - item.unitPrice) * item.quantity,
    0
  );
  const coupon = couponCode ? getCouponDiscount(couponCode, subtotal) : null;
  const couponSavings = coupon?.valid ? coupon.discount : 0;

  return {
    subtotal,
    productSavings,
    couponSavings,
    totalSavings: productSavings + couponSavings,
    total: Math.max(0, subtotal - couponSavings),
  };
}
