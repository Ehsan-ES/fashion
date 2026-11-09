import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * اجرای انیمیشن GSAP محدود به یک عنصر و پاک‌سازی خودکار.
 * در تست‌ها و با prefers-reduced-motion هیچ انیمیشنی ساخته نمی‌شود (محتوا ثابت و قابل‌مشاهده می‌ماند).
 */
export function useGsap(setup, scope, deps = []) {
  useLayoutEffect(() => {
    if (import.meta.env.MODE === "test" || prefersReducedMotion()) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => setup(gsap, ScrollTrigger), scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
