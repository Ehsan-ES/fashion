import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";
import { ASSEMBLED } from "./turnaround";
import styles from "./hero.module.css";

const HeroModel = lazy(() => import("./HeroModel"));

class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * صحنه سه‌بعدی Hero. progressRef مقدار پیشرفت اسکرول (۰ تا ۱) را می‌دهد.
 * با prefers-reduced-motion حلقه کامل و ثابت (نمای روبه‌رو) نمایش داده می‌شود (بدون حرکت). اگر WebGL نباشد، فقط پس‌زمینه CSS می‌ماند.
 * در موبایل نسخه سبک (dpr=1 و بدون antialias) رندر می‌شود.
 */
export default function Hero3D({ sourceRef, progressRef }) {
  const mobile = useMediaQuery("(max-width: 899px)");
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);
  const assembled = useMemo(() => ({ current: ASSEMBLED }), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (import.meta.env.MODE === "test") return null;

  return (
    <div ref={ref} className={styles.stage} aria-hidden="true">
      <CanvasBoundary>
        <Suspense fallback={null}>
          <HeroModel
            progress={calm ? assembled : progressRef}
            frameloop={calm ? "demand" : visible ? "always" : "never"}
            eventSource={sourceRef}
            mobile={mobile}
          />
        </Suspense>
      </CanvasBoundary>
    </div>
  );
}
