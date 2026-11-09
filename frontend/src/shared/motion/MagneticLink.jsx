import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Link } from "../router";
import { prefersReducedMotion } from "./useGsap";

/** لینک/دکمه‌ای که با نزدیک شدن موس کمی به سمت آن کشیده می‌شود (فقط دستگاه‌های دارای موس). */
export default function MagneticLink({ to, strength = 0.35, className, children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || import.meta.env.MODE === "test") return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion()) return undefined;

    const moveX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const moveY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      moveX((e.clientX - (r.left + r.width / 2)) * strength);
      moveY((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => { moveX(0); moveY(0); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [strength]);

  return <Link ref={ref} to={to} className={className} {...rest}>{children}</Link>;
}
