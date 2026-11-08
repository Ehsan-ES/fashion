import { useEffect } from "react";
import { getLenis } from "../motion/lenis";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * رفتار استاندارد پنجره‌های تمام‌صفحه: Esc، حبس Tab داخل پنل، قفل اسکرول و بازگرداندن Focus.
 * کامپوننتی که این Hook را صدا می‌زند فقط وقتی باز است Mount می‌شود.
 */
export function useModal(ref, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(ref.current?.querySelectorAll(FOCUSABLE) ?? []).filter((n) => n.getClientRects().length > 0);
    focusables()[0]?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
