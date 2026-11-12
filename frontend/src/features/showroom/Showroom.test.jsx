import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { setTestUrl } from "../../test/router";
import { useCartStore } from "../cart/useCartStore";
import { fetchShopProducts, useProduct } from "../catalog/api";
import Showroom from "./Showroom";

vi.mock("../catalog/api", () => ({
  fetchShopProducts: vi.fn(),
  useProduct: vi.fn(),
}));

vi.mock("./ShowroomScene", () => ({
  default: function SceneMock({ products, onSelect }) {
    return (
      <div aria-label="شوروم سه‌بعدی قابل گشت‌وگذار">
        {products.map((product) => (
          <button type="button" key={product.id} onClick={() => onSelect(product)}>
            نمایش در فضای سه‌بعدی: {product.name}
          </button>
        ))}
      </div>
    );
  },
}));

const products = [
  {
    id: 1, name: "پیراهن کتان", slug: "linen-shirt", brand: { name: "Maison Noor" },
    category: { name: "پیراهن" }, price: "2000000", final_price: "1500000",
    discount_percent: 25, image: "/shirt.webp", colors: [{ name: "مشکی", slug: "black", hex: "#111111" }],
  },
  {
    id: 2, name: "شلوار کتان", slug: "linen-pants", brand: null,
    category: { name: "شلوار" }, price: "1000000", final_price: "1000000",
    discount_percent: 0, image: null, colors: [],
  },
];

const productDetail = {
  ...products[0],
  images: [{ id: 1, url: "/shirt.webp", alt: "پیراهن کتان", color: "black" }],
  colors: [
    { name: "مشکی", slug: "black", hex: "#111111" },
    { name: "سفید", slug: "white", hex: "#ffffff" },
  ],
  sizes: [{ code: "M", name: "M" }, { code: "L", name: "L" }],
  variants: [
    { id: 1, color: { name: "مشکی", slug: "black", hex: "#111111" }, size: { code: "M", name: "M" }, price: "1500000", available: 2, in_stock: true },
    { id: 2, color: { name: "سفید", slug: "white", hex: "#ffffff" }, size: { code: "M", name: "M" }, price: "1500000", available: 0, in_stock: false },
    { id: 3, color: { name: "مشکی", slug: "black", hex: "#111111" }, size: { code: "L", name: "L" }, price: "1600000", available: 1, in_stock: true },
  ],
};

function renderShowroom() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><Showroom /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/showroom");
  fetchShopProducts.mockResolvedValue({ results: products });
  useProduct.mockImplementation((slug) => ({
    data: slug === "linen-shirt" ? productDetail : undefined,
    isLoading: false,
    isError: false,
  }));
  useCartStore.setState({ items: [], count: 0, couponCode: "", miniCartOpen: false });
});

test("loads API products into category navigation and the 3D showroom", async () => {
  renderShowroom();

  expect(await screen.findByRole("button", { name: "نمایش در فضای سه‌بعدی: پیراهن کتان" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "۰۱ پیراهن" })).toBeInTheDocument();
  expect(fetchShopProducts).toHaveBeenCalledWith({ page_size: 12, ordering: "-sales_count" });
});

test("clicking a 3D product opens its live product details", async () => {
  renderShowroom();

  fireEvent.click(await screen.findByRole("button", { name: "نمایش در فضای سه‌بعدی: پیراهن کتان" }));

  expect(await screen.findByRole("complementary", { name: "پیش‌نمایش پیراهن کتان" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /مشاهده‌ی صفحه کامل محصول/ })).toHaveAttribute("href", "/product/linen-shirt");
  expect(screen.getByRole("button", { name: "مشکی" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "M" })).toBeEnabled();
});

test("adds the selected in-stock color and size variant to the cart", async () => {
  renderShowroom();

  fireEvent.click(await screen.findByRole("button", { name: "نمایش در فضای سه‌بعدی: پیراهن کتان" }));
  fireEvent.click(await screen.findByRole("button", { name: "L" }));
  fireEvent.click(screen.getByRole("button", { name: "افزودن به سبد خرید" }));

  await waitFor(() => expect(useCartStore.getState().items).toMatchObject([{
    key: "1:black:L",
    variantId: 3,
    slug: "linen-shirt",
    colorName: "مشکی",
    sizeName: "L",
    unitPrice: 1600000,
    quantity: 1,
  }]));
  expect(useCartStore.getState().miniCartOpen).toBe(true);
});

test("disables unavailable colors and sizes from the product API", async () => {
  renderShowroom();

  fireEvent.click(await screen.findByRole("button", { name: "نمایش در فضای سه‌بعدی: پیراهن کتان" }));
  fireEvent.click(await screen.findByRole("button", { name: "سفید" }));

  expect(screen.getByText("این ترکیب فعلاً موجود نیست")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "این ترکیب ناموجود است" })).toBeDisabled();
});
