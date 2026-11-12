import { beforeEach, expect, test } from "vitest";
import { useCartStore } from "./useCartStore";
import { getCartTotals, getCouponDiscount } from "./discounts";

const item = {
  key: "1:black:M",
  productId: 1,
  slug: "linen-shirt",
  name: "پیراهن کتان",
  image: null,
  colorName: "مشکی",
  sizeName: "M",
  unitPrice: 1_500_000,
  originalPrice: 2_000_000,
  maxQuantity: 2,
};

beforeEach(() => {
  useCartStore.setState({ items: [], count: 0, couponCode: "", miniCartOpen: false });
  localStorage.removeItem("fashion-boutique-cart");
});

test("adds distinct variants and keeps quantity within available stock", () => {
  const { addItem, setQuantity, removeItem } = useCartStore.getState();
  addItem(item);
  addItem(item);
  addItem(item);

  expect(useCartStore.getState().count).toBe(2);
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  expect(useCartStore.getState().miniCartOpen).toBe(true);
  expect(JSON.parse(localStorage.getItem("fashion-boutique-cart")).state.count).toBe(2);

  setQuantity(item.key, 9);
  expect(useCartStore.getState().items[0].quantity).toBe(2);
  removeItem(item.key);
  expect(useCartStore.getState().count).toBe(0);
});

test("validates coupon eligibility and computes sale and coupon totals", () => {
  expect(getCouponDiscount(" bad-code ", 6_000_000).valid).toBe(false);
  expect(getCouponDiscount("STYLE15", 4_999_999).valid).toBe(false);
  expect(getCouponDiscount("style15", 5_000_000)).toMatchObject({ valid: true, discount: 750_000 });
  expect(getCartTotals([{ ...item, quantity: 2 }], "WELCOME10")).toMatchObject({
    subtotal: 3_000_000,
    productSavings: 1_000_000,
    couponSavings: 300_000,
    total: 2_700_000,
  });
});
