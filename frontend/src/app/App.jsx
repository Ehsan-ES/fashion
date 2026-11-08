import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AccountPage from "../features/account/AccountPage";
import LoginPage from "../features/auth/LoginPage";
import RequireAuth from "../features/auth/RequireAuth";
import { useAuthStore } from "../features/auth/useAuthStore";
import HomePage from "../features/home/HomePage";
import InfoPage from "../features/static/InfoPage";
import { INFO_SLUGS } from "../features/static/pages";
import ComingSoon from "../shared/components/ui/ComingSoon";
import NotFound from "../shared/components/ui/NotFound";
import MainLayout from "./layouts/MainLayout";

const queryClient = new QueryClient();

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />

            <Route path="shop" element={<ComingSoon title="فروشگاه" stage={6} />} />
            <Route path="women" element={<Navigate to="/shop?gender=women" replace />} />
            <Route path="men" element={<Navigate to="/shop?gender=men" replace />} />
            <Route path="product/:slug" element={<ComingSoon title="جزئیات محصول" stage={7} />} />
            <Route path="cart" element={<ComingSoon title="سبد خرید" stage={8} />} />
            <Route path="wishlist" element={<ComingSoon title="علاقه‌مندی‌ها" stage={9} />} />
            <Route path="track-order" element={<ComingSoon title="پیگیری سفارش" stage={11} />} />
            <Route path="showroom" element={<ComingSoon title="شو روم مجازی" stage={14} />} />

            {INFO_SLUGS.map((slug) => (
              <Route key={slug} path={slug} element={<InfoPage slug={slug} />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
