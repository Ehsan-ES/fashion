import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { navigate } from "vike/client/router";
import { setTestUrl } from "../../test/router";
import ShopPage from "./ShopPage";
import * as catalogApi from "./api";

vi.mock("./api", () => ({
  useCategories: vi.fn(),
  useProductFilters: vi.fn(),
  useShopProducts: vi.fn(),
}));

const product = {
  id: 1, name: "پیراهن کتان", slug: "linen-shirt", brand: null, price: "2000000", sale_price: null,
  final_price: "2000000", discount_percent: 0, is_new: true, is_best_seller: false, in_stock: true,
  image: null, hover_image: null, colors: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/shop");
  catalogApi.useCategories.mockReturnValue({ data: [], isLoading: false, isError: false });
  catalogApi.useProductFilters.mockReturnValue({ data: { brands: [], colors: [], sizes: [], price: {} } });
  catalogApi.useShopProducts.mockReturnValue({
    data: { count: 1, results: [product] }, isLoading: false, isError: false, isFetching: false,
  });
});

test("shows shop products and uses the configured default API parameters", () => {
  render(<ShopPage />);
  expect(screen.getByRole("heading", { name: "فروشگاه" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "پیراهن کتان" })).toBeInTheDocument();
  expect(screen.getByText("۱ محصول")).toBeInTheDocument();
  expect(catalogApi.useShopProducts).toHaveBeenCalledWith({
    page: 1, page_size: 24, ordering: "-created_at",
  });
});

test("reflects URL search and filter parameters in the product request", () => {
  setTestUrl("/shop?gender=women&category=dresses&brand=brand-a,brand-b&in_stock=true");
  render(<ShopPage />);
  expect(screen.getByRole("heading", { name: "پوشاک زنانه" })).toBeInTheDocument();
  expect(catalogApi.useShopProducts).toHaveBeenCalledWith(expect.objectContaining({
    gender: "women", category: "dresses", brand: "brand-a,brand-b", in_stock: true,
  }));
  expect(catalogApi.useProductFilters).toHaveBeenCalledWith({ gender: "women", category: "dresses" });
});

test("changes sort order through client navigation and resets pagination", () => {
  setTestUrl("/shop?page=3&gender=men");
  render(<ShopPage />);
  fireEvent.change(screen.getByLabelText("مرتب‌سازی"), { target: { value: "final_price" } });
  expect(navigate).toHaveBeenCalledWith("/shop?page=1&gender=men&ordering=final_price", { overwriteLastHistoryEntry: false });
});

test("opens an accessible mobile filter drawer", () => {
  render(<ShopPage />);
  fireEvent.click(screen.getByRole("button", { name: "فیلترها" }));
  const drawer = screen.getByRole("dialog", { name: "فیلتر محصولات" });
  expect(drawer).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "بستن فیلترها" })).toBeInTheDocument();
  expect(drawer.querySelector("[data-lenis-prevent]")).toBeInTheDocument();
});

test("shows a clear error state when product loading fails", () => {
  catalogApi.useShopProducts.mockReturnValue({ data: undefined, isLoading: false, isError: true, isFetching: false });
  render(<ShopPage />);
  expect(screen.getByRole("alert")).toHaveTextContent("دریافت محصولات با خطا مواجه شد");
});
