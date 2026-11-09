import { Link } from "../../../router";
import { site } from "../../../config/site";
import styles from "./Footer.module.css";

const SHOP = [
  ["راهنمای خرید", "/shopping-guide"],
  ["راهنمای سایزبندی", "/size-guide"],
  ["شرایط ارسال", "/shipping"],
  ["پیگیری سفارش", "/track-order"],
];
const COMPANY = [
  ["درباره ما", "/about"],
  ["تماس با ما", "/contact"],
  ["قوانین و مقررات", "/terms"],
];
const year = new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date());

export default function Footer() {
  const social = site.social.filter((s) => s.url);
  const { phone, email, address } = site.contact;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.wordmark} aria-hidden="true">{site.brand.en}</p>

        <div className={styles.grid}>
          <div>
            <h2 className={styles.title}>{site.brand.fa}</h2>
            <p className={styles.about}>
              پوشاکی برای هر روز و هر مناسبت؛ با طراحی ساده، پارچه‌های باکیفیت و تجربه خریدی آرام.
            </p>
          </div>

          <nav aria-label="خرید">
            <h2 className={styles.title}>خرید</h2>
            <ul>{SHOP.map(([label, to]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>
          </nav>

          <nav aria-label="درباره فروشگاه">
            <h2 className={styles.title}>فروشگاه</h2>
            <ul>{COMPANY.map(([label, to]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>
          </nav>

          <div>
            <h2 className={styles.title}>ارتباط با ما</h2>
            {social.length > 0 && (
              <ul className={styles.social}>
                {social.map((s) => (
                  <li key={s.label}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                ))}
              </ul>
            )}
            {(phone || email || address) && (
              <div className={styles.contact}>
                {phone && <span dir="ltr">{phone}</span>}
                {email && <span dir="ltr">{email}</span>}
                {address && <span>{address}</span>}
              </div>
            )}
            {social.length === 0 && !phone && !email && !address && (
              <p className={styles.about}>راه‌های ارتباطی به‌زودی در همین بخش قرار می‌گیرد.</p>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <span>{site.paymentMethods.join(" · ")}</span>
          <span>© {year} {site.brand.fa}. همه حقوق محفوظ است.</span>
        </div>
      </div>
    </footer>
  );
}
