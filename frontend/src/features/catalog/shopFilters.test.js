import { expect, test } from "vitest";
import { parseShopFilters, toShopApiParams, updateShopSearch } from "./shopFilters";

test("parses supported filters from a sharedable URL", () => {
  expect(parseShopFilters("?gender=women&brand=a,b&color=black&min_price=1000&page=3&on_sale=true")).toMatchObject({
    gender: "women",
    brand: ["a", "b"],
    color: ["black"],
    min_price: "1000",
    page: 3,
    on_sale: true,
  });
});

test("ignores invalid URL values and falls back to safe defaults", () => {
  expect(parseShopFilters("?gender=other&ordering=password&page=-2&min_price=-5")).toMatchObject({
    gender: "",
    ordering: "-created_at",
    page: 1,
    min_price: "",
  });
});

test("serializes active filters into API parameters", () => {
  const filters = parseShopFilters("?category=shirts&size=M,L&in_stock=true&search=linen");
  expect(toShopApiParams(filters)).toMatchObject({
    category: "shirts",
    size: "M,L",
    in_stock: true,
    search: "linen",
    page_size: 24,
  });
});

test("updates a filter while preserving other URL parameters", () => {
  expect(updateShopSearch("?gender=women&page=4&brand=a", { page: 1, brand: ["a", "b"] }))
    .toBe("?gender=women&page=1&brand=a%2Cb");
  expect(updateShopSearch("?gender=women&category=shirts", { category: "" }))
    .toBe("?gender=women");
});
