import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { setTestUrl } from "../../test/router";
import { formatPrice } from "../../shared/utils/format";
import { useCartStore } from "./useCartStore";
import CartPage from "./CartPage";

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
  quantity: 1,
  maxQuantity: 2,
};

beforeEach(() => {
  setTestUrl("/cart");
  localStorage.removeItem("fashion-boutique-cart");
  useCartStore.setState({ items: [], count: 0, couponCode: "", miniCartOpen: false });
});

test("shows an empty state and a direct shop link", () => {
  render(<CartPage />);
  expect(screen.getByText("هنوز محصولی به سبد خرید اضافه نکرده‌اید.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "رفتن به فروشگاه" })).toHaveAttribute("href", "/shop");
});

test("applies a coupon and updates the payable total", () => {
  useCartStore.setState({ items: [item], count: 1 });
  render(<CartPage />);

  fireEvent.change(screen.getByLabelText("کد تخفیف"), { target: { value: "WELCOME10" } });
  fireEvent.click(screen.getByRole("button", { name: "اعمال" }));

  expect(screen.getByRole("status")).toHaveTextContent("۱۰٪ تخفیف با موفقیت اعمال شد.");
  expect(screen.getByText(formatPrice(1_350_000))).toBeInTheDocument();
});

test("does not apply a coupon that misses its minimum subtotal", () => {
  useCartStore.setState({ items: [item], count: 1 });
  render(<CartPage />);

  fireEvent.change(screen.getByLabelText("کد تخفیف"), { target: { value: "STYLE15" } });
  fireEvent.click(screen.getByRole("button", { name: "اعمال" }));

  expect(screen.getByRole("alert")).toHaveTextContent("حداقل ۵٬۰۰۰٬۰۰۰ تومان");
  expect(useCartStore.getState().couponCode).toBe("");
});
