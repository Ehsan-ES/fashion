import { Link } from "../../router";
import styles from "./StatusPage.module.css";

export default function NotFound() {
  return (
    <section className={styles.page} aria-labelledby="nf-title">
      <h1 id="nf-title" className={styles.title}>صفحه پیدا نشد</h1>
      <p className={styles.text}>آدرسی که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است.</p>
      <Link to="/" className={styles.link}>بازگشت به صفحه اصلی</Link>
    </section>
  );
}

export function ErrorFallback() {
  return (
    <section className={styles.page} aria-labelledby="err-title">
      <h1 id="err-title" className={styles.title}>خطایی رخ داد</h1>
      <p className={styles.text}>مشکلی پیش آمد. چند لحظه بعد دوباره تلاش کنید.</p>
      <Link to="/" className={styles.link}>بازگشت به صفحه اصلی</Link>
    </section>
  );
}
