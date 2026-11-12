import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { formatPrice } from "../../../shared/utils/format";
import { useWishlistStore } from "../../wishlist/useWishlistStore";
import ProductCard from "./ProductCard";

const product = {
  id: 1, name: "پیراهن کتان", slug: "linen-shirt", brand: { name: "Maison Noor", slug: "maison-noor" },
  price: "2000000", sale_price: "1500000", final_price: "1500000", discount_percent: 25,
  is_new: true, is_best_seller: true, in_stock: true,
  image: "http://x/a.webp", hover_image: "http://x/b.webp",
  colors: [
    { name: "مشکی", slug: "black", hex: "#111111" }, { name: "سفید", slug: "white", hex: "#ffffff" },
    { name: "بژ", slug: "beige", hex: "#d8c9b5" }, { name: "زیتونی", slug: "olive", hex: "#6b6b3a" },
    { name: "شرابی", slug: "wine", hex: "#6d1f2f" },
  ],
};

beforeEach(() => {
  localStorage.removeItem("fashion-boutique-wishlist");
  useWishlistStore.setState({ items: [], count: 0 });
});

test("links to the product page and shows name, brand and final price", () => {
  render(<ProductCard product={product} />);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/product/linen-shirt");
  expect(screen.getByRole("heading", { name: "پیراهن کتان" })).toBeInTheDocument();
  expect(screen.getByText("Maison Noor")).toBeInTheDocument();
  expect(screen.getByText(formatPrice("1500000"))).toBeInTheDocument();
});

test("can save a product from its card and update the wishlist count", () => {
  render(<ProductCard product={product} />);
  const button = screen.getByRole("button", { name: `افزودن ${product.name} به علاقه‌مندی‌ها` });

  fireEvent.click(button);

  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(useWishlistStore.getState().count).toBe(1);
  expect(JSON.parse(localStorage.getItem("fashion-boutique-wishlist")).state.items).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: `حذف ${product.name} از علاقه‌مندی‌ها` }));
  expect(useWishlistStore.getState().count).toBe(0);
});

test("shows discount, new and best-seller badges and the old price", () => {
  const { container } = render(<ProductCard product={product} />);
  expect(screen.getByText(/۲۵٪ تخفیف/)).toBeInTheDocument();
  expect(screen.getByText("جدید")).toBeInTheDocument();
  expect(screen.getByText("پرفروش")).toBeInTheDocument();
  expect(container.querySelector("del")).toBeInTheDocument();
});

test("renders the primary and the hover image", () => {
  const { container } = render(<ProductCard product={product} />);
  const imgs = container.querySelectorAll("img");
  expect(imgs).toHaveLength(2);
  expect(imgs[0]).toHaveAttribute("alt", "پیراهن کتان");
  expect(imgs[1]).toHaveAttribute("aria-hidden", "true");
});

test("limits color dots and lists all color names for screen readers", () => {
  const { container } = render(<ProductCard product={product} />);
  expect(container.querySelectorAll("[title]")).toHaveLength(4);
  expect(screen.getByText(/رنگ‌ها: مشکی، سفید، بژ، زیتونی، شرابی/)).toBeInTheDocument();
  expect(screen.getByText("+۱")).toBeInTheDocument();
});

test("regular product without sale or images", () => {
  const plain = { ...product, sale_price: null, discount_percent: 0, is_new: false, is_best_seller: false,
    image: null, hover_image: null, in_stock: false, colors: [], brand: null };
  const { container } = render(<ProductCard product={plain} />);
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("del")).toBeNull();
  expect(screen.queryByText("جدید")).toBeNull();
  expect(screen.getByText("ناموجود")).toBeInTheDocument();
});
