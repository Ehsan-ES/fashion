import { api } from "../../shared/services/api";

export const requestOtp = (phone) => api.post("/auth/otp/request/", { phone }).then((r) => r.data);
export const verifyOtp = (phone, code) => api.post("/auth/otp/verify/", { phone, code }).then((r) => r.data);
export const logoutRequest = () => api.post("/auth/logout/");
export const fetchMe = () => api.get("/users/me/").then((r) => r.data);
export const updateMe = (payload) => api.patch("/users/me/", payload).then((r) => r.data);
