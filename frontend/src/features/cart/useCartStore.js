import { create } from "zustand";

/** شمارنده سبد خرید برای Navbar. در مرحله ۸ (Cart) با داده واقعی API پر می‌شود. */
export const useCartStore = create((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));
