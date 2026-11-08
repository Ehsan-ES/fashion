import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8500/api";

export const api = axios.create({
  baseURL,
  withCredentials: true, // Refresh Token در HttpOnly Cookie
  timeout: 15000,
});

let accessToken = null; // فقط در حافظه؛ هرگز در localStorage ذخیره نمی‌شود
let onAuthLost = null;
let refreshPromise = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

/** چند درخواست هم‌زمان فقط یک Refresh می‌زنند. */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/token/refresh/`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.access;
        return accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        accessToken = null;
        onAuthLost?.();
      }
    }
    return Promise.reject(error);
  }
);
