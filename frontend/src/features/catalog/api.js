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
