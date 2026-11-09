import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/services/api";

const FIVE_MIN = 5 * 60 * 1000;

export const fetchCategories = () => api.get("/categories/").then((r) => r.data);
export const fetchFeaturedCollections = () => api.get("/collections/", { params: { featured: 1 } }).then((r) => r.data);
export const searchProducts = (q, pageSize = 6) =>
  api.get("/products/", { params: { search: q, page_size: pageSize } }).then((r) => r.data);

export const useCategories = () =>
  useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: FIVE_MIN, retry: 1 });

export const useFeaturedCollections = () =>
  useQuery({ queryKey: ["collections", "featured"], queryFn: fetchFeaturedCollections, staleTime: FIVE_MIN, retry: 1 });

// ---------- لیست‌های صفحه اصلی
const TWO_MIN = 2 * 60 * 1000;

const listQuery = (key, path, size) => ({
  queryKey: ["products", key, size],
  queryFn: () => api.get(path, { params: { page_size: size } }).then((r) => r.data.results),
  staleTime: TWO_MIN,
  retry: 1,
});

export const useNewArrivals = (size = 6) => useQuery(listQuery("new", "/products/new-arrivals/", size));
export const useBestSellers = (size = 8) => useQuery(listQuery("best", "/products/best-sellers/", size));
export const useSaleProducts = (size = 4) => useQuery(listQuery("sale", "/products/sale/", size));
export const useFeaturedProducts = (size = 4) => useQuery(listQuery("featured", "/products/featured/", size));
