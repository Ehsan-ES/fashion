import { create } from "zustand";

/** وقتی Hero صفحه اصلی «پین» است، Navbar شفاف می‌ماند. */
export const useHeroStore = create((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));
