import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import WishlistPage from "./WishlistPage";
import { useWishlistStore } from "./useWishlistStore";

const product = {
  id: 21,
  name: "مانتو لینن",
  slug: "linen-coat",
  price: "2400000",
  final_price: "2100000",
  discount_percent: 12,
  in_stock: true,
  image: "/products/linen-coat.webp",
  colors: [],
};

beforeEach(() => {
  localStorage.removeItem("fashion-boutique-wishlist");
  useWishlistStore.setState({ items: [], count: 0 });
});

test("shows a shop link when the wishlist is empty", () => {
  render(<WishlistPage />);

  expect(screen.getByRole("heading", { name: "هنوز انتخابی ذخیره نکرده‌اید" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "کشف محصولات" })).toHaveAttribute("href", "/shop");
});

test("shows saved products and removes them from the wishlist", () => {
  useWishlistStore.getState().toggleItem(product);
  render(<WishlistPage />);

  expect(screen.getByRole("heading", { name: product.name })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: `حذف ${product.name} از علاقه‌مندی‌ها` }));

  expect(screen.getByRole("heading", { name: "هنوز انتخابی ذخیره نکرده‌اید" })).toBeInTheDocument();
  expect(useWishlistStore.getState().count).toBe(0);
});

test("can clear all saved products", () => {
  useWishlistStore.getState().toggleItem(product);
  render(<WishlistPage />);

  fireEvent.click(screen.getByRole("button", { name: "پاک‌کردن فهرست" }));

  expect(screen.getByRole("heading", { name: "هنوز انتخابی ذخیره نکرده‌اید" })).toBeInTheDocument();
  expect(useWishlistStore.getState().items).toEqual([]);
});
