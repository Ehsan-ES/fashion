import { Link } from "../../shared/router";
import { formatNumber } from "../../shared/utils/format";
import ProductCard from "../catalog/components/ProductCard";
import { useWishlistStore } from "./useWishlistStore";
import styles from "./wishlist.module.css";

export default function WishlistPage() {
  const items = useWishlistStore((state) => state.items);
  const clearItems = useWishlistStore((state) => state.clearItems);

  return (
    <section className={styles.page} dir="rtl" aria-labelledby="wishlist-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>THE BOUTIQUE EDIT · SAVED</p>
        <h1 id="wishlist-title">علاقه‌مندی‌های شما</h1>
        <p className={styles.intro}>انتخاب‌هایی که ارزش دوباره دیدن دارند، اینجا منتظر شما هستند.</p>
      </header>

      {items.length === 0 ? (
        <section className={styles.empty} aria-labelledby="wishlist-empty-title">
          <span className={styles.emptyMark} aria-hidden="true">♡</span>
          <h2 id="wishlist-empty-title">هنوز انتخابی ذخیره نکرده‌اید</h2>
          <p>در فروشگاه، روی نشان قلب محصولات بزنید تا اینجا نگه‌شان دارید.</p>
          <Link className={styles.shopLink} to="/shop">کشف محصولات</Link>
        </section>
      ) : (
        <section aria-label="محصولات ذخیره‌شده">
          <div className={styles.listHeading}>
            <p>{formatNumber(items.length)} انتخاب ذخیره‌شده</p>
            <button type="button" onClick={clearItems}>پاک‌کردن فهرست</button>
          </div>
          <div className={styles.grid}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
