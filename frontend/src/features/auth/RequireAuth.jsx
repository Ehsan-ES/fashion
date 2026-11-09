import { Navigate, useLocation } from "../../shared/router";
import { useAuthStore } from "./useAuthStore";

export default function RequireAuth({ children }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === "idle" || status === "loading") return <p role="status" style={{ padding: "var(--space-6)" }}>در حال بارگذاری...</p>;
  if (status !== "authenticated") {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}
