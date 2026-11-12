import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useAuthStore } from "../auth/useAuthStore";
import { setTestUrl } from "../../test/router";
import AccountPage from "./AccountPage";

vi.mock("./api", () => ({
  fetchOrders: vi.fn(),
  cancelOrder: vi.fn(),
}));
vi.mock("../cart/api", () => ({ startOrderPayment: vi.fn() }));

import { cancelOrder, fetchOrders } from "./api";
import { startOrderPayment } from "../cart/api";

const pendingOrder = {
  order_number: "8a894000-b845-4aeb-a4bd-12134727ec03",
  status: "pending",
  recipient_name: "مینا رضایی",
  recipient_phone: "09123456789",
  province: "تهران",
  city: "تهران",
  address_line: "خیابان ولیعصر",
  postal_code: "1234567890",
  subtotal: "2650000",
  product_discount: "0",
  coupon_code: "",
  coupon_discount: "0",
  total: "2650000",
  created_at: "2026-11-10T12:00:00Z",
  items: [{
    product_name: "شلوار کارگو",
    sku: "CARGO-BLK-M",
    color_name: "مشکی",
    size_name: "M",
    quantity: 1,
    unit_price: "2650000",
    line_total: "2650000",
  }],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AccountPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/account");
  useAuthStore.setState({
    user: { first_name: "مینا", last_name: "رضایی", email: "", phone: "09123456789" },
    status: "authenticated",
  });
  fetchOrders.mockResolvedValue([]);
});

test("shows an empty state and links to the shop when there are no orders", async () => {
  renderPage();

  expect(await screen.findByText("هنوز سفارشی ثبت نکرده‌اید.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "مشاهده محصولات" })).toHaveAttribute("href", "/shop");
});

test("shows order details and requires confirmation before cancelling", async () => {
  const cancelledOrder = { ...pendingOrder, status: "cancelled" };
  fetchOrders.mockResolvedValueOnce([pendingOrder]).mockResolvedValueOnce([cancelledOrder]);
  cancelOrder.mockResolvedValue({ ...pendingOrder, status: "cancelled" });
  renderPage();

  const orderItems = await screen.findByRole("list", { name: "اقلام سفارش" });
  expect(orderItems).toHaveTextContent("شلوار کارگو");
  expect(orderItems).toHaveTextContent("مشکی · M");
  expect(screen.getAllByText("در انتظار پرداخت")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "لغو سفارش" }));
  expect(screen.getByText("از لغو این سفارش مطمئن هستید؟")).toBeInTheDocument();
  expect(cancelOrder).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "بله، لغو شود" }));
  await waitFor(() => expect(cancelOrder.mock.calls[0][0]).toBe(pendingOrder.order_number));
  expect(await screen.findAllByText("لغوشده")).toHaveLength(2);
});

test("shows the invoice and opens the payment provider for a pending order", async () => {
  fetchOrders.mockResolvedValue([pendingOrder]);
  startOrderPayment.mockResolvedValue({ payment_url: "https://sandbox.zarinpal.com/pay" });
  renderPage();

  await screen.findByText("شلوار کارگو");
  const invoiceSummary = screen.getByText("مشاهده و چاپ فاکتور");
  const invoiceDetails = invoiceSummary.closest("details");
  fireEvent.click(invoiceSummary);
  invoiceDetails.open = true;
  fireEvent.click(screen.getByRole("button", { name: "پرداخت آنلاین با زرین‌پال" }));

  expect(await screen.findByRole("link", { name: "ادامه به درگاه پرداخت" }))
    .toHaveAttribute("href", "https://sandbox.zarinpal.com/pay");
  expect(startOrderPayment.mock.calls[0][0]).toBe(pendingOrder.order_number);
});

test("shows the result of the payment callback", async () => {
  fetchOrders.mockResolvedValue([]);
  setTestUrl("/account?payment=success&order_number=order-uuid");
  renderPage();

  expect(await screen.findByText("پرداخت سفارش با موفقیت تأیید شد.")).toHaveAttribute("role", "status");
});

test("shows a clear error when order loading fails", async () => {
  fetchOrders.mockRejectedValue({ response: { data: { detail: "اتصال برقرار نشد." } } });
  renderPage();

  expect(await screen.findByRole("alert")).toHaveTextContent("اتصال برقرار نشد.");
  expect(screen.getByRole("button", { name: "تلاش دوباره" })).toBeInTheDocument();
});
