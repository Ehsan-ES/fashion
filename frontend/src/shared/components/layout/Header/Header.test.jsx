import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useAuthStore } from "../../../../features/auth/useAuthStore";
import { useCartStore } from "../../../../features/cart/useCartStore";
import { searchProducts } from "../../../../features/catalog/api";
import { setTestUrl } from "../../../../test/router";
import { formatPrice } from "../../../utils/format";
import Header from "./Header";

vi.mock("../../../../features/catalog/api", () => ({
  useCategories: () => ({
    data: [
      { id: 1, name: "پیراهن", slug: "shirt", image: "http://x/shirt.webp" },
      { id: 2, name: "شلوار", slug: "pants", image: null },
    ],
  }),
  useFeaturedCollections: () => ({ data: [{ id: 1, name: "کالکشن بهاره", slug: "spring-edit" }] }),
  searchProducts: vi.fn(),
}));

function renderHeader({ transparentOnTop = true } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Header transparentOnTop={transparentOnTop} />
    </QueryClientProvider>
  );
}

const setScroll = (y) => Object.defineProperty(window, "scrollY", { value: y, configurable: true });

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/");
  setScroll(0);
  useAuthStore.setState({ user: null, status: "anonymous" });
  useCartStore.setState({ count: 0 });
});

test("is transparent on top of the home page and solid elsewhere", () => {
  const first = renderHeader();
  expect(first.container.querySelector("header")).toHaveAttribute("data-tone", "light");
  first.unmount();
  const second = renderHeader({ transparentOnTop: false });
  expect(second.container.querySelector("header")).toHaveAttribute("data-tone", "dark");
});

test("becomes solid and compact after scrolling", async () => {
  const { container } = renderHeader();
  setScroll(300);
  fireEvent.scroll(window);
  await waitFor(() => expect(container.querySelector("header")).toHaveAttribute("data-tone", "dark"));
  expect(container.querySelector("header")).toHaveAttribute("data-compact", "true");
});

test("mega menu opens with category links, closes with Escape", () => {
  const { container } = renderHeader();
  const trigger = screen.getByRole("button", { name: /زنانه/ });
  fireEvent.click(trigger);

  expect(screen.getByRole("region", { name: "منوی زنانه" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "پیراهن" })).toHaveAttribute("href", "/shop?gender=women&category=shirt");
  expect(screen.getByRole("link", { name: "کالکشن بهاره" })).toHaveAttribute("href", "/shop?collection=spring-edit");
  expect(container.querySelector("header")).toHaveAttribute("data-tone", "dark");

  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "منوی زنانه" })).not.toBeInTheDocument();
});

test("touch click toggles the mega menu", () => {
  renderHeader();
  const trigger = screen.getByRole("button", { name: /مردانه/ });
  fireEvent.pointerDown(trigger, { pointerType: "touch" });
  fireEvent.click(trigger);
  expect(screen.getByRole("region", { name: "منوی مردانه" })).toBeInTheDocument();
  fireEvent.pointerDown(trigger, { pointerType: "touch" });
  fireEvent.click(trigger);
  expect(screen.queryByRole("region", { name: "منوی مردانه" })).not.toBeInTheDocument();
});

test("mobile menu opens as a dialog and closes", () => {
  renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "باز کردن منو" }));
  const dialog = screen.getByRole("dialog", { name: "منوی اصلی" });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ورود / ثبت‌نام" })).toHaveAttribute("href", "/login");

  fireEvent.click(screen.getByRole("button", { name: "بستن منو" }));
  expect(screen.queryByRole("dialog", { name: "منوی اصلی" })).not.toBeInTheDocument();
});

test("search overlay shows live results from the API", async () => {
  searchProducts.mockResolvedValue({
    count: 1,
    results: [{ id: 1, name: "پیراهن کتان", slug: "linen-shirt", final_price: "800000", in_stock: true, image: null }],
  });
  renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "جستجو" }));

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "کتان" } });
  expect(await screen.findByText("پیراهن کتان", {}, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.getByText(formatPrice("800000"))).toBeInTheDocument();
  expect(searchProducts).toHaveBeenCalledWith("کتان");
  expect(screen.getByRole("link", { name: /پیراهن کتان/ })).toHaveAttribute("href", "/product/linen-shirt");
});

test("cart badge and account link reflect state", () => {
  useCartStore.setState({ count: 3 });
  useAuthStore.setState({ user: { phone: "09123456789" }, status: "authenticated" });
  renderHeader();
  expect(screen.getByRole("link", { name: "سبد خرید، ۳ محصول" })).toHaveAttribute("href", "/cart");
  expect(screen.getByRole("link", { name: "حساب کاربری" })).toHaveAttribute("href", "/account");
});
