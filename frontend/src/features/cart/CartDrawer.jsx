import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "../../shared/router";
import { useModal } from "../../shared/hooks/useModal";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import { useCartStore } from "./useCartStore";
import { getCartTotals } from "./discounts";
import styles from "./cartDrawer.module.css";

function CartPanel({ onClose }) {
  const ref = useRef(null);
  useModal(ref, onClose);
  const items = useCartStore((state) => state.items);
  const setMiniCartOpen = useCartStore((state) => state.setMiniCartOpen);
  const totals = getCartTotals(items, useCartStore.getState().couponCode);

  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        ref={ref}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-cart-title"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        dir="rtl"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>انتخاب شما</p>
            <h2 id="mini-cart-title">سبد خرید</h2>
          </div>
          <button type="button" className={styles.close} aria-label="بستن سبد خرید" onClick={onClose}>×</button>
        </header>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>سبد خرید شما خالی است.</p>
            <Link to="/shop" onClick={onClose}>مشاهده فروشگاه</Link>
          </div>
        ) : (
          <>
            <ul className={styles.items}>
              {items.map((item) => (
                <li className={styles.item} key={item.key}>
                  {item.image
                    ? <img src={item.image} alt="" />
                    : <span className={styles.imageFallback} aria-hidden="true">{item.name.slice(0, 1)}</span>}
                  <div className={styles.itemInfo}>
                    <Link to={`/product/${item.slug}`} onClick={onClose}>{item.name}</Link>
                    <span>{[item.colorName, item.sizeName].filter(Boolean).join(" · ")}</span>
                    <span>{formatNumber(item.quantity)} × {formatPrice(item.unitPrice)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.summary}>
              {totals.productSavings > 0 && <p><span>تخفیف محصولات</span><strong>− {formatPrice(totals.productSavings)}</strong></p>}
              <p><span>جمع سبد</span><strong>{formatPrice(totals.subtotal)}</strong></p>
            </div>
            <div className={styles.actions}>
              <Link className={styles.checkout} to="/cart" onClick={onClose}>مشاهده سبد و ادامه</Link>
              <button type="button" className={styles.continue} onClick={() => setMiniCartOpen(false)}>ادامه خرید</button>
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}

export default function CartDrawer() {
  const open = useCartStore((state) => state.miniCartOpen);
  const setMiniCartOpen = useCartStore((state) => state.setMiniCartOpen);
  return (
    <AnimatePresence>
      {open && <CartPanel key="cart-panel" onClose={() => setMiniCartOpen(false)} />}
    </AnimatePresence>
  );
}
