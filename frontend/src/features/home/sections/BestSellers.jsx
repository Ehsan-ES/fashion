import { useRef } from "react";
import { useBestSellers } from "../../catalog/api";
import ProductCard, { ProductCardSkeleton } from "../../catalog/components/ProductCard";
import { ChevronIcon } from "../../../shared/components/layout/Header/icons";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function BestSellers() {
  const { data, isLoading, isError } = useBestSellers(8);
  const rail = useRef(null);
  if (isError || (!isLoading && !data?.length)) return null;

  const scroll = (direction) => () => {
    const el = rail.current;
    if (!el) return;
    // در RTL «بعدی» به سمت چپ است و scrollLeft منفی می‌شود
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: direction * dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className={styles.section} aria-labelledby="best-sellers">
      <SectionHeader id="best-sellers" eyebrow="BEST SELLERS" title="پرفروش‌ها" to="/shop?ordering=-sales_count" />
      <div className={styles.railWrap}>
        <div className={styles.arrows} style={{ marginBlockEnd: "var(--space-3)" }}>
          <button type="button" className={styles.arrow} aria-label="قبلی" onClick={scroll(-1)}>
            <ChevronIcon style={{ transform: "rotate(-90deg)" }} />
          </button>
          <button type="button" className={styles.arrow} aria-label="بعدی" onClick={scroll(1)}>
            <ChevronIcon style={{ transform: "rotate(90deg)" }} />
          </button>
        </div>
        <div ref={rail} className={styles.rail} role="list">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.map((p, i) => (
                <div key={p.id} role="listitem"><ProductCard product={p} priority={i < 2} /></div>
              ))}
        </div>
      </div>
    </section>
  );
}
