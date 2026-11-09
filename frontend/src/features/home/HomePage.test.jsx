import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import HomePage from "./HomePage";
import * as api from "../catalog/api";

vi.mock("../catalog/api", () => ({
  useNewArrivals: vi.fn(), useBestSellers: vi.fn(), useSaleProducts: vi.fn(), useFeaturedProducts: vi.fn(),
  useCategories: vi.fn(), useFeaturedCollections: vi.fn(),
}));

const product = (id, extra = {}) => ({
  id, name: `محصول ${id}`, slug: `p${id}`, brand: null, price: "1000000", sale_price: null, final_price: "1000000",
  discount_percent: 0, is_new: false, is_best_seller: false, in_stock: true, image: null, hover_image: null, colors: [], ...extra,
});
const ok = (data) => ({ data, isLoading: false, isError: false });

beforeEach(() => {
  api.useNewArrivals.mockReturnValue(ok([product(1), product(2)]));
  api.useBestSellers.mockReturnValue(ok([product(3)]));
  api.useSaleProducts.mockReturnValue(ok([product(4, { sale_price: "600000", final_price: "600000", discount_percent: 40 })]));
  api.useFeaturedProducts.mockReturnValue(ok([product(5)]));
  api.useCategories.mockReturnValue(ok([{ id: 1, name: "پیراهن", slug: "shirt", image: null }]));
  api.useFeaturedCollections.mockReturnValue(ok([{ id: 1, name: "کالکشن بهاره", slug: "spring", description: "سبک", cover_image: null }]));
});

test("renders the hero and every data section", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("استایلی که با شما می‌ماند");
  for (const name of ["تازه‌ها", "کالکشن‌های ویژه", "خرید بر اساس دسته‌بندی", "پرفروش‌ها", "پیشنهادهای ویژه", "منتخب فروشگاه"]) {
    expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
  }
  expect(screen.getByText("محصول 1")).toBeInTheDocument();
});

test("hero buttons link to the shop filtered by gender", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: "Shop Women" })).toHaveAttribute("href", "/shop?gender=women");
  expect(screen.getByRole("link", { name: "Shop Men" })).toHaveAttribute("href", "/shop?gender=men");
});

test("section links point to filtered shop pages", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: /پیراهن/ })).toHaveAttribute("href", "/shop?category=shirt");
  expect(screen.getByRole("link", { name: /کالکشن بهاره/ })).toHaveAttribute("href", "/shop?collection=spring");
  expect(screen.getByText(/تا ۴۰٪/)).toBeInTheDocument();
});

test("sections with no data or an error are hidden, the rest stay", () => {
  api.useBestSellers.mockReturnValue(ok([]));
  api.useSaleProducts.mockReturnValue({ data: undefined, isLoading: false, isError: true });
  api.useCategories.mockReturnValue(ok([]));
  render(<HomePage />);
  expect(screen.queryByRole("heading", { level: 2, name: "پرفروش‌ها" })).toBeNull();
  expect(screen.queryByRole("heading", { level: 2, name: "پیشنهادهای ویژه" })).toBeNull();
  expect(screen.queryByRole("heading", { level: 2, name: "خرید بر اساس دسته‌بندی" })).toBeNull();
  expect(screen.getByRole("heading", { level: 2, name: "تازه‌ها" })).toBeInTheDocument();
});

test("shows skeletons while loading", () => {
  api.useNewArrivals.mockReturnValue({ data: undefined, isLoading: true, isError: false });
  const { container } = render(<HomePage />);
  expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(5);
  expect(screen.getByRole("heading", { level: 2, name: "تازه‌ها" })).toBeInTheDocument();
});
