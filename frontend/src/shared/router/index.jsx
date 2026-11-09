/**
 * تنها نقطه اتصال کد برنامه به Router (Vike). بقیه کدها فقط از اینجا import می‌کنند،
 * پس تغییر Router در آینده فقط همین فایل را تغییر می‌دهد.
 */
import { useCallback, useEffect, useMemo } from "react";
import { navigate as vikeNavigate } from "vike/client/router";
import { usePageContext } from "vike-react/usePageContext";

/** لینک داخلی؛ Vike کلیک را برای ناوبری سمت کلاینت رهگیری می‌کند. */
export function Link({ to, replace, children, ...rest }) {
  return <a href={to} {...rest}>{children}</a>;
}

export function useLocation() {
  const { urlPathname, urlParsed } = usePageContext();
  return { pathname: urlPathname, search: urlParsed?.searchOriginal ?? "" };
}

export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouteParams() {
  return usePageContext().routeParams ?? {};
}

export function useNavigate() {
  return useCallback((to, options = {}) => {
    return vikeNavigate(to, { overwriteLastHistoryEntry: Boolean(options.replace) });
  }, []);
}

export function Navigate({ to, replace }) {
  useEffect(() => {
    vikeNavigate(to, { overwriteLastHistoryEntry: Boolean(replace) });
  }, [to, replace]);
  return null;
}
