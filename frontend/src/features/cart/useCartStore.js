import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const getCount = (items) => items.reduce((total, item) => total + item.quantity, 0);

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      count: 0,
      couponCode: "",
      miniCartOpen: false,
      addItem: (newItem) => set((state) => {
        const existing = state.items.find((item) => item.key === newItem.key);
        const items = existing
          ? state.items.map((item) => item.key === newItem.key
            ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) }
            : item)
          : [...state.items, { ...newItem, quantity: 1 }];
        return { items, count: getCount(items), miniCartOpen: true };
      }),
      setQuantity: (key, quantity) => set((state) => {
        const items = state.items.map((item) => item.key === key
          ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.maxQuantity)) }
          : item);
        return { items, count: getCount(items) };
      }),
      removeItem: (key) => set((state) => {
        const items = state.items.filter((item) => item.key !== key);
        return { items, count: getCount(items), ...(items.length ? {} : { couponCode: "" }) };
      }),
      clearItems: () => set({ items: [], count: 0, couponCode: "" }),
      setCouponCode: (couponCode) => set({ couponCode }),
      setMiniCartOpen: (miniCartOpen) => set({ miniCartOpen }),
    }),
    {
      name: "fashion-boutique-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items, count, couponCode }) => ({ items, count, couponCode }),
    }
  )
);
