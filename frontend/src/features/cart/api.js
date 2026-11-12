import { api } from "../../shared/services/api";

export const createOrder = (payload) => api.post("/orders/", payload).then((response) => response.data);

export const startOrderPayment = (orderNumber) =>
  api.post(`/orders/${encodeURIComponent(orderNumber)}/pay/`).then((response) => response.data);
