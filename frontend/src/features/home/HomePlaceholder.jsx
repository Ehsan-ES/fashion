import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../shared/services/api";
import { useAuthStore } from "../auth/useAuthStore";
import fa from "../../i18n/fa";

export default function HomePlaceholder() {
  const status = useAuthStore((s) => s.status);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get("/health/")).data,
    retry: false,
  });
  const msg = isLoading ? fa.health.loading : isError ? fa.health.error : fa.health.ok;
  return (
    <main style={{ padding: "var(--space-8) var(--space-5)" }}>
      <h1 style={{ fontSize: "var(--fs-display)" }}>{fa.brand}</h1>
      <p role="status">{msg}</p>
      <nav aria-label="حساب کاربری">
        {status === "authenticated" ? <Link to="/account">حساب کاربری</Link> : <Link to="/login">ورود / ثبت‌نام</Link>}
      </nav>
      {data && <pre dir="ltr">{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
