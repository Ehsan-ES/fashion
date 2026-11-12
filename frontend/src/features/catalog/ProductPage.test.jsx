import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { setTestUrl } from "../../test/router";
import { useAuthStore } from "../auth/useAuthStore";
import { useCartStore } from "../cart/useCartStore";
import { useWishlistStore } from "../wishlist/useWishlistStore";
import ProductPage from "./ProductPage";
import * as catalogApi from "./api";

vi.mock("./api", () => ({
  submitProductQuestion: vi.fn(),
  submitProductReview: vi.fn(),
  useCompleteTheLook: vi.fn(),
  useProduct: vi.fn(),
  useProductQuestions: vi.fn(),
  useProductReviews: vi.fn(),
}));

const product = {
  id: 1,
  name: "پیراهن کتان",
  slug: "linen-shirt",
  brand: { name: "Maison Noor", slug: "maison-noor" },
  category: { name: "پیراهن", slug: "shirt" },
  gender: "women",
  price: "2000000",
  sale_price: "1500000",
  final_price: "1500000",
  discount_percent: 25,
  is_new: true,
  is_best_seller: true,
  is_featured: false,
  in_stock: true,
  image: null,
  hover_image: null,
  colors: [{ name: "مشکی", slug: "black", hex: "#111111" }, { name: "سفید", slug: "white", hex: "#ffffff" }],
  images: [{ id: 1, url: "/shirt.webp", alt: "پیراهن کتان", color: "black" }],
  variants: [
    { id: 2, color: { name: "سفید", slug: "white", hex: "#ffffff" }, size: { code: "M", name: "M", group: "apparel" }, price: "1500000", available: 0, in_stock: false },
    { id: 1, color: { name: "مشکی", slug: "black", hex: "#111111" }, size: { code: "M", name: "M", group: "apparel" }, price: "1500000", available: 2, in_stock: true },
  ],
  sizes: [{ code: "M", name: "M", group: "apparel" }],
  model_size: "M",
  model_height_cm: 175,
  description: "پارچه کتان باکیفیت",
  material: "کتان",
  construction: "دوخت دقیق",
  country_of_origin: "ایران",
  collections: [{ name: "بهاره", slug: "spring" }],
};

const related = [{
  id: 2, name: "شلوار کتان", slug: "linen-pants", brand: null, price: "1000000", sale_price: null,
  final_price: "1000000", discount_percent: 0, is_new: false, is_best_seller: false, in_stock: true,
  image: null, hover_image: null, colors: [],
}];

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ProductPage />
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/product/linen-shirt");
  globalThis.__pageContext.routeParams = { slug: "linen-shirt" };
  useAuthStore.setState({ user: null, status: "anonymous" });
  useCartStore.setState({ items: [], count: 0, couponCode: "", miniCartOpen: false });
  localStorage.removeItem("fashion-boutique-wishlist");
  useWishlistStore.setState({ items: [], count: 0 });
  catalogApi.useProduct.mockReturnValue({ data: product, isLoading: false, isError: false });
  catalogApi.useCompleteTheLook.mockReturnValue({ data: related, isLoading: false, isError: false });
  catalogApi.useProductReviews.mockReturnValue({
    data: { count: 1, average: 5, results: [{ id: 1, author: "مشتری بوتیک", rating: 5, title: "عالی", body: "کیفیت خوبی دارد.", created_at: "2026-11-10T12:00:00Z" }] },
    isLoading: false, isError: false,
  });
  catalogApi.useProductQuestions.mockReturnValue({
    data: { count: 1, results: [{ id: 1, author: "مشتری بوتیک", body: "جنس آن چیست؟", created_at: "2026-11-10T12:00:00Z", answers: [{ id: 1, body: "کتان طبیعی.", created_at: "2026-11-10T13:00:00Z" }] }] },
    isLoading: false, isError: false,
  });
});

test("renders product detail, variant choices, and related products", () => {
  renderPage();
  expect(screen.getByRole("heading", { name: product.name })).toBeInTheDocument();
  expect(screen.getByText("Maison Noor")).toBeInTheDocument();
  expect(screen.getByText("پارچه کتان باکیفیت")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "مشکی" })).toBeChecked();
  expect(screen.getByRole("img", { name: "پیراهن کتان" })).toHaveAttribute("src", "/shirt.webp");
  expect(screen.getByRole("radio", { name: "M" })).toBeChecked();
  expect(screen.getByRole("heading", { name: "شلوار کتان" })).toBeInTheDocument();
});

test("updates available variant when selecting another color", () => {
  renderPage();
  fireEvent.click(screen.getByRole("radio", { name: "سفید" }));
  expect(screen.getByText("این ترکیب فعلاً موجود نیست")).toBeInTheDocument();
});

test("adds the selected in-stock variant to the cart", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "افزودن به سبد خرید" }));

  expect(useCartStore.getState().items).toMatchObject([{
    key: "1:black:M",
    variantId: 1,
    slug: "linen-shirt",
    colorName: "مشکی",
    sizeName: "M",
    unitPrice: 1500000,
    quantity: 1,
  }]);
  expect(useCartStore.getState().miniCartOpen).toBe(true);
});

test("saves and removes the product from the wishlist", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: `افزودن ${product.name} به علاقه‌مندی‌ها` }));

  expect(useWishlistStore.getState().items).toHaveLength(1);
  expect(useWishlistStore.getState().items[0].image).toBe("/shirt.webp");
  const savedButton = screen.getByRole("button", { name: `حذف ${product.name} از علاقه‌مندی‌ها` });
  expect(savedButton).toHaveTextContent("ذخیره‌شده در علاقه‌مندی‌ها");

  fireEvent.click(savedButton);
  expect(useWishlistStore.getState().items).toHaveLength(0);
});

test("shows approved reviews, answers, and sign-in links for submissions", () => {
  renderPage();
  expect(screen.getByText("کیفیت خوبی دارد.")).toBeInTheDocument();
  expect(screen.getByText("کتان طبیعی.")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "وارد حساب کاربری" })).toHaveLength(2);
});
