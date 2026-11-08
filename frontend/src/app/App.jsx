import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AccountPage from "../features/account/AccountPage";
import LoginPage from "../features/auth/LoginPage";
import RequireAuth from "../features/auth/RequireAuth";
import { useAuthStore } from "../features/auth/useAuthStore";
import HomePlaceholder from "../features/home/HomePlaceholder";

const queryClient = new QueryClient();

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePlaceholder />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
