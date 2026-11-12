import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "./lenis";

/** اسکرول نرم (Lenis) هماهنگ با GSAP ScrollTrigger. با prefers-reduced-motion غیرفعال می‌شود. */
export default function SmoothScroll() {
  useEffect(() => {
    if (import.meta.env.MODE === "test") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    // عیب‌یابی: افزودن ?smooth=off به آدرس، اسکرول نرم را خاموش می‌کند
    if (new URLSearchParams(window.location.search).get("smooth") === "off") return undefined;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    setLenis(lenis);

    const onScroll = () => ScrollTrigger.update();
    const tick = (time) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      setLenis(null);
    };
  }, []);
  return null;
}
