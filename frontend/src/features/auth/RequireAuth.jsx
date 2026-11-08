import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./useAuthStore";

export default function RequireAuth({ children }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === "idle" || status === "loading") return <p role="status" style={{ padding: "var(--space-6)" }}>در حال بارگذاری...</p>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
