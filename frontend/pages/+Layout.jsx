import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MainLayout from "../src/app/layouts/MainLayout";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import "../src/styles/tokens.css";
import "../src/styles/base.css";
import "../src/styles/rtl.css";

const queryClient = new QueryClient();

export default function Layout({ children }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
    bootstrap(); // بازیابی نشست از Refresh Cookie
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>{children}</MainLayout>
    </QueryClientProvider>
  );
}
