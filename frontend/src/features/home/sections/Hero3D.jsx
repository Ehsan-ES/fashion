import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";
import styles from "./hero.module.css";

const HeroCloth = lazy(() => import("./HeroCloth"));

class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * المان سه‌بعدی Hero. فقط روی صفحه‌های عریض و بدون prefers-reduced-motion بارگذاری می‌شود
 * (کد Three.js جداگانه و تنبل لود می‌شود). در غیر این صورت پس‌زمینه CSS ثابت می‌ماند.
 */
export default function Hero3D({ sourceRef }) {
  const wide = useMediaQuery("(min-width: 900px)");
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [wide, calm]);

  if (!wide || calm) return null;
  return (
    <div ref={ref} className={styles.canvas} aria-hidden="true">
      <CanvasBoundary>
        <Suspense fallback={null}>
          <HeroCloth active={visible} eventSource={sourceRef} />
        </Suspense>
      </CanvasBoundary>
    </div>
  );
}
