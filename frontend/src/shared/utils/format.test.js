import { expect, test } from "vitest";
import { formatNumber, formatPrice } from "./format";

test("formatPrice uses Persian digits and currency", () => {
  expect(formatPrice(1200000)).toMatch(/^۱.?۲۰۰.?۰۰۰ تومان$/);
  expect(formatPrice("800000")).toContain("تومان");
});

test("formatNumber", () => {
  expect(formatNumber(3)).toBe("۳");
});
