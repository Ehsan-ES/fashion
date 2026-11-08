import { create } from "zustand";
import { refreshAccessToken, setAccessToken, setAuthLostHandler } from "../../shared/services/api";
import { fetchMe, logoutRequest } from "./authService";

export const useAuthStore = create((set, get) => ({
  user: null,
  status: "idle", // idle | loading | authenticated | anonymous

  setSession: (access, user) => {
    setAccessToken(access);
    set({ user, status: "authenticated" });
  },
  setUser: (user) => set({ user }),

  /** هنگام باز شدن سایت: اگر Cookie معتبر باشد نشست بازیابی می‌شود. */
  bootstrap: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading" });
    try {
      await refreshAccessToken();
      const user = await fetchMe();
      set({ user, status: "authenticated" });
    } catch {
      setAccessToken(null);
      set({ user: null, status: "anonymous" });
    }
  },

  logout: async () => {
    try { await logoutRequest(); } catch { /* حتی با خطا، نشست محلی پاک می‌شود */ }
    setAccessToken(null);
    set({ user: null, status: "anonymous" });
  },
}));

setAuthLostHandler(() => useAuthStore.setState({ user: null, status: "anonymous" }));
