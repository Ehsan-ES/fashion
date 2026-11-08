import { Link } from "react-router-dom";
import { site } from "../../shared/config/site";
import styles from "./HomePage.module.css";

/** صفحه موقت: Hero سینمایی، کالکشن‌ها و سایر بخش‌ها در مرحله ۵ ساخته می‌شوند. */
export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <p className={styles.eyebrow}>{site.brand.en}</p>
        <h1 id="hero-title" className={styles.title}>{site.brand.fa}</h1>
        <div className={styles.actions}>
          <Link to="/shop?gender=women" className={styles.btn}>Shop Women</Link>
          <Link to="/shop?gender=men" className={styles.btn}>Shop Men</Link>
        </div>
      </section>
      <section className={styles.next}>
        <p>بخش‌های اصلی صفحه (تازه‌ها، کالکشن‌ها، پرفروش‌ها و ...) در مرحله ۵ اضافه می‌شوند.</p>
      </section>
    </>
  );
}
