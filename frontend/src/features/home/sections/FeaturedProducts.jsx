import { useFeaturedProducts } from "../../catalog/api";
import ProductCard, { ProductCardSkeleton } from "../../catalog/components/ProductCard";
import Reveal from "../../../shared/motion/Reveal";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function FeaturedProducts() {
  const { data, isLoading, isError } = useFeaturedProducts(4);
  if (isError || (!isLoading && !data?.length)) return null;

  return (
    <section className={styles.section} aria-labelledby="featured">
      <SectionHeader id="featured" eyebrow="FEATURED" title="منتخب فروشگاه" to="/shop" />
      <div className={styles.grid4}>
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
          : data.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08}>
                <ProductCard product={p} />
              </Reveal>
            ))}
      </div>
    </section>
  );
}
