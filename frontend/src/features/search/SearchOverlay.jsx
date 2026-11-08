import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { CloseIcon } from "../../shared/components/layout/Header/icons";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { useModal } from "../../shared/hooks/useModal";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import { searchProducts } from "../catalog/api";
import styles from "./search.module.css";

/** جستجوی سریع Navbar. سیستم کامل (پیشنهاد، تاریخچه، Recommendation) در مرحله ۱۲ ساخته می‌شود. */
export default function SearchOverlay({ onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  useModal(ref, onClose);

  const term = useDebouncedValue(q.trim(), 300);
  const enabled = term.length >= 2;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", term],
    queryFn: () => searchProducts(term),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const results = enabled ? data?.results ?? [] : [];
  const target = `/shop?search=${encodeURIComponent(term || q.trim())}`;

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    onClose();
    navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <motion.div
      ref={ref}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="جستجو"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.inner}>
        <form className={styles.form} role="search" onSubmit={submit}>
          <label htmlFor="site-search" className="sr-only">جستجو در محصولات</label>
          <input
            id="site-search"
            className={styles.input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام محصول، برند یا دسته‌بندی..."
            autoComplete="off"
          />
          <button type="submit" className={styles.submit}>جستجو</button>
          <button type="button" className={styles.close} aria-label="بستن جستجو" onClick={onClose}><CloseIcon /></button>
        </form>

        <div aria-live="polite">
          {!enabled && <p className={styles.status}>حداقل ۲ حرف وارد کنید.</p>}
          {enabled && isFetching && <p className={styles.status}>در حال جستجو...</p>}
          {enabled && !isFetching && isError && <p className={styles.status}>جستجو با خطا مواجه شد. دوباره تلاش کنید.</p>}
          {enabled && !isFetching && !isError && results.length === 0 && (
            <p className={styles.status}>نتیجه‌ای برای «{term}» پیدا نشد.</p>
          )}
        </div>

        {results.length > 0 && (
          <ul className={styles.list}>
            {results.map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.slug}`} className={styles.item} onClick={onClose}>
                  {p.image ? <img className={styles.thumb} src={p.image} alt="" loading="lazy" /> : <span className={styles.thumb} />}
                  <span>
                    <span className={styles.name}>{p.name}</span>
                    <br />
                    <span className={styles.price}>{formatPrice(p.final_price)}</span>
                    {!p.in_stock && <span className={styles.sold}> · ناموجود</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data && data.count > results.length && (
          <Link to={target} className={styles.all} onClick={onClose}>مشاهده همه {formatNumber(data.count)} نتیجه</Link>
        )}
      </div>
    </motion.div>
  );
}
