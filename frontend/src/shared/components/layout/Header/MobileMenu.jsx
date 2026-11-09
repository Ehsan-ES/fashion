import { useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "../../../router";
import { site } from "../../../config/site";
import { useModal } from "../../../hooks/useModal";
import { formatNumber } from "../../../utils/format";
import { ChevronIcon, CloseIcon } from "./icons";
import styles from "./Header.module.css";

const GENDERS = [{ key: "women", label: "زنانه" }, { key: "men", label: "مردانه" }];
const EASE = [0.22, 1, 0.36, 1];
const ORIGIN = "92% 4%"; // محل دکمه همبرگری در RTL

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } };
const itemVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

export default function MobileMenu({ categories, authed, cartCount, wishCount, onClose }) {
  const ref = useRef(null);
  useModal(ref, onClose);

  return (
    <motion.div
      ref={ref}
      className={styles.mobile}
      role="dialog"
      aria-modal="true"
      aria-label="منوی اصلی"
      initial={{ clipPath: `circle(0% at ${ORIGIN})` }}
      animate={{ clipPath: `circle(150% at ${ORIGIN})` }}
      exit={{ clipPath: `circle(0% at ${ORIGIN})` }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className={styles.mobileTop}>
        <span className={styles.logo}>{site.brand.en}</span>
        <button type="button" className={styles.iconBtn} aria-label="بستن منو" onClick={onClose}><CloseIcon /></button>
      </div>

      <motion.ul className={styles.mobileList} variants={listVariants} initial="hidden" animate="show">
        {GENDERS.map((g) => (
          <motion.li key={g.key} variants={itemVariants}>
            <details>
              <summary>{g.label}<ChevronIcon /></summary>
              <div className={styles.mobileSub}>
                <Link to={`/shop?gender=${g.key}`} onClick={onClose}>همه محصولات</Link>
                {categories.map((c) => (
                  <Link key={c.id} to={`/shop?gender=${g.key}&category=${c.slug}`} onClick={onClose}>{c.name}</Link>
                ))}
              </div>
            </details>
          </motion.li>
        ))}
        <motion.li variants={itemVariants}><Link className={styles.mobileLink} to="/showroom" onClick={onClose}>شو روم</Link></motion.li>
        <motion.li variants={itemVariants}><Link className={styles.mobileLink} to="/shop?on_sale=true" onClick={onClose}>تخفیف‌ها</Link></motion.li>
      </motion.ul>

      <div className={styles.mobileFoot}>
        <Link to={authed ? "/account" : "/login"} onClick={onClose}>{authed ? "حساب کاربری" : "ورود / ثبت‌نام"}</Link>
        <Link to="/wishlist" onClick={onClose}>علاقه‌مندی‌ها{wishCount > 0 && <span>{formatNumber(wishCount)}</span>}</Link>
        <Link to="/cart" onClick={onClose}>سبد خرید{cartCount > 0 && <span>{formatNumber(cartCount)}</span>}</Link>
      </div>
    </motion.div>
  );
}
