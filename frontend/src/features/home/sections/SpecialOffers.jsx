import { useSaleProducts } from "../../catalog/api";
import ProductCard, { ProductCardSkeleton } from "../../catalog/components/ProductCard";
import Reveal from "../../../shared/motion/Reveal";
import { formatNumber } from "../../../shared/utils/format";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function SpecialOffers() {
  const { data, isLoading, isError } = useSaleProducts(4);
  if (isError || (!isLoading && !data?.length)) return null;
  const best = data ? Math.max(...data.map((p) => p.discount_percent)) : 0;

  return (
    <div className={styles.dark}>
      <section className={styles.section} aria-labelledby="offers">
        <SectionHeader id="offers" eyebrow="SPECIAL OFFERS" title="پیشنهادهای ویژه" to="/shop?on_sale=true">
          {best > 0 && <p className={styles.bigPercent} aria-hidden="true">تا {formatNumber(best)}٪</p>}
        </SectionHeader>
        <div className={styles.grid4}>
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08}>
                  <ProductCard product={p} variant="dark" />
                </Reveal>
              ))}
        </div>
      </section>
    </div>
  );
}
