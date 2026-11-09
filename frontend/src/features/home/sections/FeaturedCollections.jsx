import { useFeaturedCollections } from "../../catalog/api";
import Reveal from "../../../shared/motion/Reveal";
import { Link } from "../../../shared/router";
import SectionHeader from "./SectionHeader";
import styles from "./sections.module.css";

export default function FeaturedCollections() {
  const { data, isLoading, isError } = useFeaturedCollections();
  const items = (data ?? []).slice(0, 3);
  if (isLoading || isError || items.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="collections">
      <SectionHeader id="collections" eyebrow="COLLECTIONS" title="کالکشن‌های ویژه" />
      <div className={styles.collections}>
        {items.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.1}>
            <Link to={`/shop?collection=${c.slug}`} className={styles.collection}>
              {c.cover_image && <img src={c.cover_image} alt="" width="1200" height="800" loading="lazy" decoding="async" />}
              <span className={styles.collectionBody}>
                <h3 className={styles.collectionTitle}>{c.name}</h3>
                {c.description && <p className={styles.collectionText}>{c.description}</p>}
                <span className={styles.collectionCta}>مشاهده کالکشن</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
