import { create } from "zustand";

/** شمارنده علاقه‌مندی‌ها برای Navbar. در مرحله ۹ (Wishlist) با داده واقعی پر می‌شود. */
export const useWishlistStore = create((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));
