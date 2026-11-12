import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useAuthStore } from "../auth/useAuthStore";
import { setTestUrl } from "../../test/router";
import { createOrder } from "./api";
import { useCartStore } from "./useCartStore";
import CheckoutPage from "./CheckoutPage";

const html2pdf = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  createOrder: vi.fn(),
  startOrderPayment: vi.fn(),
}));
vi.mock("html2pdf.js", () => ({ default: html2pdf }));

const item = {
  key: "1:black:M",
  productId: 1,
  variantId: 10,
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

function renderCheckout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><CheckoutPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/checkout");
  localStorage.removeItem("fashion-boutique-cart");
  html2pdf.mockReset();
  useAuthStore.setState({
    user: { phone: "09123456789", first_name: "مریم", last_name: "رضایی" },
    status: "authenticated",
  });
  useCartStore.setState({ items: [item], count: 1, couponCode: "WELCOME10", miniCartOpen: false });
});

test("submits only variant IDs and quantities and clears the cart after server confirmation", async () => {
  createOrder.mockResolvedValue({
    order_number: "order-uuid",
    status: "pending",
    recipient_name: "مریم رضایی",
    recipient_phone: "09123456789",
    province: "تهران",
    city: "تهران",
    address_line: "خیابان ولیعصر",
    postal_code: "1234567890",
    subtotal: "1500000",
    product_discount: "500000",
    coupon_code: "WELCOME10",
    coupon_discount: "150000",
    total: "1350000",
    created_at: "2026-11-10T12:00:00Z",
    items: [{
      product_name: "پیراهن کتان",
      sku: "LINEN-BLK-M",
      color_name: "مشکی",
      size_name: "M",
      quantity: 1,
      unit_price: "1500000",
      line_total: "1500000",
    }],
  });
  renderCheckout();
  expect(screen.queryByText(/مالیات/)).not.toBeInTheDocument();
  expect(screen.getByText("مبلغ قابل پرداخت").parentElement)
    .toHaveTextContent("۱٬۳۵۰٬۰۰۰ تومان");

  fireEvent.change(screen.getByLabelText("استان"), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText("شهر"), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText("نشانی کامل"), { target: { value: "خیابان ولیعصر" } });
  fireEvent.change(screen.getByLabelText("کد پستی ۱۰ رقمی"), { target: { value: "1234567890" } });
  fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

  await screen.findByText("سفارش شما ثبت شد");
  expect(screen.getByText("پیش‌فاکتور سفارش")).toBeInTheDocument();
  const worker = {
    set: vi.fn(),
    from: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  worker.set.mockReturnValue(worker);
  worker.from.mockReturnValue(worker);
  html2pdf.mockReturnValue(worker);
  const invoice = screen.getByRole("article", { name: "پیش‌فاکتور سفارش" });
  expect(invoice).not.toHaveTextContent("مالیات ارزش افزوده");
  fireEvent.click(screen.getByRole("button", { name: "دانلود فاکتور PDF" }));
  await waitFor(() => expect(worker.save).toHaveBeenCalledOnce());
  expect(worker.from).toHaveBeenCalledWith(invoice);
  expect(createOrder.mock.calls[0][0]).toEqual({
    recipient_name: "مریم رضایی",
    recipient_phone: "09123456789",
    province: "تهران",
    city: "تهران",
    address_line: "خیابان ولیعصر",
    postal_code: "1234567890",
    coupon_code: "WELCOME10",
    items: [{ variant_id: 10, quantity: 1 }],
  });
  await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
});

test("shows server validation errors and keeps the cart intact", async () => {
  createOrder.mockRejectedValue({
    response: { data: { items: ["موجودی کافی نیست."] } },
  });
  renderCheckout();

  fireEvent.change(screen.getByLabelText("استان"), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText("شهر"), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText("نشانی کامل"), { target: { value: "خیابان ولیعصر" } });
  fireEvent.change(screen.getByLabelText("کد پستی ۱۰ رقمی"), { target: { value: "1234567890" } });
  fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("موجودی کافی نیست.");
  expect(useCartStore.getState().items).toHaveLength(1);
});
