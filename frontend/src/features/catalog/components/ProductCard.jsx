import { Link } from "../../../shared/router";
import { formatNumber, formatPrice } from "../../../shared/utils/format";
import styles from "./ProductCard.module.css";

const MAX_DOTS = 4;

/**
 * کارت محصول. دکمه‌های افزودن سریع به سبد، علاقه‌مندی و مشاهده سریع همراه Cart (مرحله ۸) و Wishlist (مرحله ۹)
 * اضافه می‌شوند تا هیچ دکمه بی‌عملکردی نمایش داده نشود.
 */
export default function ProductCard({ product: p, variant = "default", priority = false }) {
  const onSale = p.discount_percent > 0;
  const colors = p.colors ?? [];
  const dots = colors.slice(0, MAX_DOTS);
  const extra = colors.length - dots.length;

  return (
    <article className={styles.card} data-variant={variant}>
      <Link to={`/product/${p.slug}`} className={styles.link}>
        <div className={styles.media}>
          {p.image ? (
            <img
              className={styles.img}
              src={p.image}
              alt={p.name}
              width="600"
              height="800"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
            />
          ) : (
            <span className={styles.empty} aria-hidden="true">{p.name.slice(0, 1)}</span>
          )}
          {p.hover_image && (
            <img
              className={`${styles.img} ${styles.hover}`}
              src={p.hover_image}
              alt=""
              aria-hidden="true"
              width="600"
              height="800"
              loading="lazy"
              decoding="async"
            />
          )}

          <ul className={styles.badges}>
            {onSale && <li className={`${styles.badge} ${styles.badgeSale}`}>{formatNumber(p.discount_percent)}٪ تخفیف</li>}
            {p.is_new && <li className={styles.badge}>جدید</li>}
            {p.is_best_seller && <li className={`${styles.badge} ${styles.badgeBest}`}>پرفروش</li>}
          </ul>
          {!p.in_stock && <span className={styles.sold}>ناموجود</span>}
        </div>

        <div className={styles.info}>
          {p.brand && <span className={styles.brand}>{p.brand.name}</span>}
          <h3 className={styles.name}>{p.name}</h3>
          <p className={styles.price}>
            {onSale && (
              <>
                <span className="sr-only">قیمت اصلی</span>
                <del className={styles.old}>{formatNumber(p.price)}</del>
              </>
            )}
            <span className="sr-only">قیمت</span>
            <span className={styles.now}>{formatPrice(p.final_price)}</span>
          </p>
          {colors.length > 0 && (
            <div className={styles.colors}>
              <span className="sr-only">رنگ‌ها: {colors.map((c) => c.name).join("، ")}</span>
              {dots.map((c) => (
                <span key={c.slug} className={styles.dot} style={{ background: c.hex }} aria-hidden="true" title={c.name} />
              ))}
              {extra > 0 && <span aria-hidden="true">+{formatNumber(extra)}</span>}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.media} />
      <div className={styles.info}>
        <div className={styles.line} />
        <div className={styles.line} />
      </div>
    </div>
  );
}
