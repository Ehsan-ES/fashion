import { useCategories } from "../../catalog/api";
import Reveal from "../../../shared/motion/Reveal";
import { Link } from "../../../shared/router";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function ShopByCategory() {
  const { data, isLoading, isError } = useCategories();
  const items = data ?? [];
  if (isLoading || isError || items.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="categories">
      <SectionHeader id="categories" eyebrow="CATEGORIES" title="خرید بر اساس دسته‌بندی" to="/shop" />
      <ul className={styles.cats}>
        {items.map((c, i) => (
          <li key={c.id}>
            <Reveal delay={(i % 5) * 0.06}>
              <Link to={`/shop?category=${c.slug}`} className={styles.cat}>
                {c.image && <img src={c.image} alt="" width="600" height="800" loading="lazy" decoding="async" />}
                <span>{c.name}</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
