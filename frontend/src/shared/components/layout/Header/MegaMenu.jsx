import { motion } from "framer-motion";
import { Link } from "../../../router";
import styles from "./Header.module.css";

const LABELS = { women: "زنانه", men: "مردانه" };

export default function MegaMenu({ gender, categories, collections, onPointerEnter, onNavigate }) {
  const label = LABELS[gender];
  const base = `/shop?gender=${gender}`;
  const tiles = categories.filter((c) => c.image).slice(0, 3);

  return (
    <motion.div
      id="mega-menu"
      role="region"
      aria-label={`منوی ${label}`}
      className={styles.mega}
      onPointerEnter={onPointerEnter}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.megaInner}>
        <div className={styles.megaCol}>
          <h3 className={styles.megaTitle}>برای شما</h3>
          <ul>
            <li><Link to={`${base}&ordering=-created_at`} onClick={onNavigate}>جدیدترین‌ها</Link></li>
            <li><Link to={`${base}&ordering=-sales_count`} onClick={onNavigate}>پرفروش‌ها</Link></li>
            <li><Link to={`${base}&on_sale=true`} onClick={onNavigate}>تخفیف‌دار</Link></li>
            <li><Link to={base} onClick={onNavigate}>همه محصولات {label}</Link></li>
          </ul>
          {collections.length > 0 && (
            <>
              <h3 className={styles.megaTitle}>کالکشن‌ها</h3>
              <ul>
                {collections.map((c) => (
                  <li key={c.id}><Link to={`/shop?collection=${c.slug}`} onClick={onNavigate}>{c.name}</Link></li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.megaCol}>
          <h3 className={styles.megaTitle}>دسته‌بندی‌ها</h3>
          <ul>
            {categories.map((c) => (
              <li key={c.id}><Link to={`${base}&category=${c.slug}`} onClick={onNavigate}>{c.name}</Link></li>
            ))}
          </ul>
        </div>

        {tiles.length > 0 && (
          <div className={styles.tiles}>
            {tiles.map((c) => (
              <Link key={c.id} to={`${base}&category=${c.slug}`} className={styles.tile} onClick={onNavigate} aria-hidden="true" tabIndex={-1}>
                <img src={c.image} alt="" loading="lazy" width="300" height="400" />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
