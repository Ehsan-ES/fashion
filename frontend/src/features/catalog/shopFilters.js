export const SHOP_PAGE_SIZE = 24;
export const SORT_OPTIONS = [
  { value: "-created_at", label: "جدیدترین" },
  { value: "final_price", label: "ارزان‌ترین" },
  { value: "-final_price", label: "گران‌ترین" },
  { value: "-sales_count", label: "پرفروش‌ترین" },
  { value: "-popularity", label: "محبوب‌ترین" },
];

const splitList = (value) => [...new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
const positiveNumber = (value) => {
  if (!value) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(Math.floor(parsed)) : "";
};
const positivePage = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

export function parseShopFilters(search) {
  const params = new URLSearchParams(search);
  const ordering = params.get("ordering");
  return {
    gender: ["women", "men", "unisex"].includes(params.get("gender")) ? params.get("gender") : "",
    category: params.get("category") ?? "",
    collection: params.get("collection") ?? "",
    search: params.get("search") ?? "",
    brand: splitList(params.get("brand")),
    color: splitList(params.get("color")),
    size: splitList(params.get("size")),
    min_price: positiveNumber(params.get("min_price")),
    max_price: positiveNumber(params.get("max_price")),
    on_sale: params.get("on_sale") === "true",
    in_stock: params.get("in_stock") === "true",
    is_new: params.get("is_new") === "true",
    ordering: SORT_OPTIONS.some((option) => option.value === ordering) ? ordering : "-created_at",
    page: positivePage(params.get("page")),
  };
}

export function toShopApiParams(filters) {
  const params = { page: filters.page, page_size: SHOP_PAGE_SIZE, ordering: filters.ordering };
  for (const key of ["gender", "category", "collection", "search", "min_price", "max_price"]) {
    if (filters[key]) params[key] = filters[key];
  }
  for (const key of ["brand", "color", "size"]) {
    if (filters[key].length) params[key] = filters[key].join(",");
  }
  for (const key of ["on_sale", "in_stock", "is_new"]) {
    if (filters[key]) params[key] = true;
  }
  return params;
}

export function updateShopSearch(search, updates) {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(updates)) {
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
      else params.delete(key);
    } else if (value === "" || value === null || value === undefined || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
