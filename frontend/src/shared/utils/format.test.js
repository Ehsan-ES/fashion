import { expect, test } from "vitest";
import { formatNumber, formatPrice } from "./format";

// جداکننده هزارگان به نسخه ICU وابسته است؛ فقط ارقام و واحد را بررسی می‌کنیم
const digits = (text) => (text.match(/[۰-۹]/g) ?? []).join("");

test("formatPrice uses Persian digits and the currency", () => {
  const text = formatPrice(1200000);
  expect(digits(text)).toBe("۱۲۰۰۰۰۰");
  expect(text.endsWith("تومان")).toBe(true);
  expect(digits(formatPrice("800000"))).toBe("۸۰۰۰۰۰");
});

test("formatNumber", () => {
  expect(formatNumber(3)).toBe("۳");
});
