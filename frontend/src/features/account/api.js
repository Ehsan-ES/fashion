import { api } from "../../shared/services/api";

export const fetchOrders = () =>
  api.get("/orders/", { params: { page_size: 100 } }).then((response) => response.data.results);

export const cancelOrder = (orderNumber) =>
  api.post(`/orders/${encodeURIComponent(orderNumber)}/cancel/`).then((response) => response.data);
