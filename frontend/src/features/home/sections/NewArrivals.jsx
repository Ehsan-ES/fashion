import { useNewArrivals } from "../../catalog/api";
import ProductCard, { ProductCardSkeleton } from "../../catalog/components/ProductCard";
import Reveal from "../../../shared/motion/Reveal";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function NewArrivals() {
  const { data, isLoading, isError } = useNewArrivals(6);
  if (isError || (!isLoading && !data?.length)) return null;

  return (
    <section className={styles.section} aria-labelledby="new-arrivals">
      <SectionHeader id="new-arrivals" eyebrow="NEW ARRIVALS" title="تازه‌ها" to="/shop?ordering=-created_at" />
      <div className={styles.asym}>
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)
          : data.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.08}>
                <ProductCard product={p} priority={i < 2} />
              </Reveal>
            ))}
      </div>
    </section>
  );
}
