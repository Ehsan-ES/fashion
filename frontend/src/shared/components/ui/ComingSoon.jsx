import { Link } from "../../router";
import styles from "./StatusPage.module.css";

/** مسیرهایی که در مراحل بعدی ساخته می‌شوند؛ آدرس‌ها از همین حالا ثابت‌اند. */
export default function ComingSoon({ title, stage }) {
  return (
    <section className={styles.page} aria-labelledby="cs-title">
      <h1 id="cs-title" className={styles.title}>{title}</h1>
      <p className={styles.text}>این بخش در مرحله {stage} از توسعه ساخته می‌شود.</p>
      <Link to="/" className={styles.link}>بازگشت به صفحه اصلی</Link>
    </section>
  );
}
