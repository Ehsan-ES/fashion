import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useAuthStore } from "../../../../features/auth/useAuthStore";
import { useCartStore } from "../../../../features/cart/useCartStore";
import { useHeroStore } from "../../../state/useHeroStore";
import { useWishlistStore } from "../../../../features/wishlist/useWishlistStore";
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
  useWishlistStore.setState({ items: [], count: 0 });
  useCartStore.setState({ count: 0, items: [], miniCartOpen: false });
  useHeroStore.setState({ active: false });
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

test("stays transparent while the hero is pinned, even when scrolled", async () => {
  useHeroStore.setState({ active: true });
  const { container } = renderHeader();
  setScroll(300);
  fireEvent.scroll(window);
  await waitFor(() => expect(container.querySelector("header")).toHaveAttribute("data-compact", "true"));
  expect(container.querySelector("header")).toHaveAttribute("data-tone", "light");
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
  expect(dialog.querySelector('a[href="/shop"]')).toHaveTextContent("همه فروشگاه");
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
  useCartStore.setState({ count: 3, items: [], miniCartOpen: false });
  useAuthStore.setState({ user: { phone: "09123456789" }, status: "authenticated" });
  renderHeader();
  expect(screen.getByRole("link", { name: "سبد خرید، ۳ محصول" })).toHaveAttribute("href", "/cart");
  expect(screen.getByRole("link", { name: "حساب کاربری" })).toHaveAttribute("href", "/account");
});

test("hides the saved-item count while signed out but keeps saved items", () => {
  useWishlistStore.setState({ items: [{ id: 1 }, { id: 2 }], count: 2 });
  const { container } = renderHeader();
  const favorites = screen.getByRole("link", { name: "علاقه‌مندی‌ها" });
  expect(favorites).toHaveAttribute("href", "/wishlist");
  expect(favorites).not.toHaveTextContent(/\d/);
  expect(useWishlistStore.getState().items).toHaveLength(2);
  expect(container.querySelectorAll("header .badge")).toHaveLength(0);
});

test("hides the saved-item count immediately after logout", () => {
  useAuthStore.setState({ user: { phone: "09123456789" }, status: "authenticated" });
  useWishlistStore.setState({ items: [{ id: 1 }, { id: 2 }], count: 2 });
  const { container } = renderHeader();

  expect(screen.getByRole("link", { name: "علاقه‌مندی‌ها" })).toHaveTextContent("۲");
  act(() => useAuthStore.setState({ user: null, status: "anonymous" }));
  expect(screen.getByRole("link", { name: "علاقه‌مندی‌ها" })).not.toHaveTextContent(/\d/);
  expect(container.querySelectorAll("header .badge")).toHaveLength(0);
});

test("hides the saved-item count in the mobile menu while signed out", () => {
  useWishlistStore.setState({ items: [{ id: 1 }, { id: 2 }], count: 2 });
  renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "باز کردن منو" }));

  const favorites = screen.getByRole("dialog", { name: "منوی اصلی" })
    .querySelector('a[href="/wishlist"]');
  expect(favorites).toHaveTextContent("علاقه‌مندی‌ها");
  expect(favorites).not.toHaveTextContent(/\d/);
});

test("offers a direct link to the full shop in the desktop navigation", () => {
  renderHeader();
  expect(screen.getByRole("link", { name: "همه فروشگاه" })).toHaveAttribute("href", "/shop");
});
