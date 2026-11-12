import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/services/api";

const FIVE_MIN = 5 * 60 * 1000;

export const fetchCategories = () => api.get("/categories/").then((r) => r.data);
export const fetchFeaturedCollections = () => api.get("/collections/", { params: { featured: 1 } }).then((r) => r.data);
export const searchProducts = (q, pageSize = 6) =>
  api.get("/products/", { params: { search: q, page_size: pageSize } }).then((r) => r.data);

export const fetchShopProducts = (params) =>
  api.get("/products/", { params }).then((r) => r.data);

export const fetchProductFilters = (params) =>
  api.get("/products/filters/", { params }).then((r) => r.data);

export const fetchProduct = (slug) =>
  api.get(`/products/${encodeURIComponent(slug)}/`).then((r) => r.data);

export const fetchRelatedProducts = (slug) =>
  api.get(`/products/${encodeURIComponent(slug)}/related/`).then((r) => r.data);

export const fetchCompleteTheLook = (slug) =>
  api.get(`/products/${encodeURIComponent(slug)}/complete-the-look/`).then((r) => r.data);

export const fetchProductReviews = (slug) =>
  api.get(`/products/${encodeURIComponent(slug)}/reviews/`).then((r) => r.data);

export const submitProductReview = (slug, payload) =>
  api.post(`/products/${encodeURIComponent(slug)}/reviews/`, payload).then((r) => r.data);

export const fetchProductQuestions = (slug) =>
  api.get(`/products/${encodeURIComponent(slug)}/questions/`).then((r) => r.data);

export const submitProductQuestion = (slug, payload) =>
  api.post(`/products/${encodeURIComponent(slug)}/questions/`, payload).then((r) => r.data);

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

export const useShopProducts = (params) =>
  useQuery({
    queryKey: ["products", "shop", params],
    queryFn: () => fetchShopProducts(params),
    placeholderData: (previousData) => previousData,
    staleTime: TWO_MIN,
    retry: 1,
  });

export const useProductFilters = (params) =>
  useQuery({
    queryKey: ["product-filters", params],
    queryFn: () => fetchProductFilters(params),
    staleTime: FIVE_MIN,
    retry: 1,
  });

export const useProduct = (slug) =>
  useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug),
    enabled: Boolean(slug),
    staleTime: TWO_MIN,
    retry: 1,
  });

export const useRelatedProducts = (slug) =>
  useQuery({
    queryKey: ["products", "related", slug],
    queryFn: () => fetchRelatedProducts(slug),
    enabled: Boolean(slug),
    staleTime: TWO_MIN,
    retry: 1,
  });

export const useCompleteTheLook = (slug) =>
  useQuery({
    queryKey: ["products", "complete-the-look", slug],
    queryFn: () => fetchCompleteTheLook(slug),
    enabled: Boolean(slug),
    staleTime: TWO_MIN,
    retry: 1,
  });

export const useProductReviews = (slug) =>
  useQuery({
    queryKey: ["product-reviews", slug],
    queryFn: () => fetchProductReviews(slug),
    enabled: Boolean(slug),
    staleTime: TWO_MIN,
    retry: 1,
  });

export const useProductQuestions = (slug) =>
  useQuery({
    queryKey: ["product-questions", slug],
    queryFn: () => fetchProductQuestions(slug),
    enabled: Boolean(slug),
    staleTime: TWO_MIN,
    retry: 1,
  });
