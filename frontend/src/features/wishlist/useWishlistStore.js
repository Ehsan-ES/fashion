import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useWishlistStore = create(
  persist(
    (set) => ({
      items: [],
      count: 0,
      toggleItem: (product) => set((state) => {
        const exists = state.items.some((item) => item.id === product.id);
        const items = exists
          ? state.items.filter((item) => item.id !== product.id)
          : [...state.items, product];
        return { items, count: items.length };
      }),
      clearItems: () => set({ items: [], count: 0 }),
    }),
    {
      name: "fashion-boutique-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items }) => ({ items }),
      merge: (persistedState, currentState) => {
        const items = Array.isArray(persistedState?.items) ? persistedState.items : [];
        return { ...currentState, ...persistedState, items, count: items.length };
      },
    }
  )
);
