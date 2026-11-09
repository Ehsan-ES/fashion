import { useRef } from "react";
import { useGsap } from "./useGsap";

/** ظاهر شدن نرم هنگام اسکرول (یک‌بار). */
export default function Reveal({ as: Tag = "div", delay = 0, y = 40, className, children, ...rest }) {
  const ref = useRef(null);
  useGsap((gsap) => {
    gsap.from(ref.current, {
      y, opacity: 0, duration: 0.9, delay, ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
    });
  }, ref, []);
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}
