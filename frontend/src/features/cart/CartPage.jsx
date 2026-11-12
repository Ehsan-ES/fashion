import { useState } from "react";
import { Link } from "../../shared/router";
import { useAuthStore } from "../auth/useAuthStore";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import { getCartTotals, getCouponDiscount } from "./discounts";
import { useCartStore } from "./useCartStore";
import styles from "./cartPage.module.css";

function CartLine({ item }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  return (
    <li className={styles.line}>
      <Link to={`/product/${item.slug}`} className={styles.imageLink} aria-label={`مشاهده ${item.name}`}>
        {item.image
          ? <img src={item.image} alt="" />
          : <span className={styles.imageFallback} aria-hidden="true">{item.name.slice(0, 1)}</span>}
      </Link>
      <div className={styles.lineDetails}>
        <Link className={styles.productName} to={`/product/${item.slug}`}>{item.name}</Link>
        <span className={styles.variant}>{[item.colorName, item.sizeName].filter(Boolean).join(" · ")}</span>
        <strong>{formatPrice(item.unitPrice)}</strong>
        <div className={styles.lineActions}>
          <div className={styles.quantity} aria-label={`تعداد ${item.name}`}>
            <button type="button" aria-label={`افزایش تعداد ${item.name}`} disabled={item.quantity >= item.maxQuantity}
              onClick={() => setQuantity(item.key, item.quantity + 1)}>+</button>
            <span aria-live="polite">{formatNumber(item.quantity)}</span>
            <button type="button" aria-label={`کاهش تعداد ${item.name}`} disabled={item.quantity <= 1}
              onClick={() => setQuantity(item.key, item.quantity - 1)}>−</button>
          </div>
          <button type="button" className={styles.remove} onClick={() => removeItem(item.key)}>حذف</button>
        </div>
      </div>
      <strong className={styles.lineTotal}>{formatPrice(item.unitPrice * item.quantity)}</strong>
    </li>
  );
}

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const couponCode = useCartStore((state) => state.couponCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const [couponInput, setCouponInput] = useState(couponCode);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState(false);
  const totals = getCartTotals(items, couponCode);
  const activeCoupon = couponCode ? getCouponDiscount(couponCode, totals.subtotal) : null;

  const applyCoupon = (event) => {
    event.preventDefault();
    const result = getCouponDiscount(couponInput, totals.subtotal);
    setCouponError(!result.valid);
    setCouponMessage(result.message);
    if (result.valid) setCouponCode(couponInput.trim().toUpperCase());
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponInput("");
    setCouponMessage("کد تخفیف حذف شد.");
    setCouponError(false);
  };

  return (
    <section className={styles.page} aria-labelledby="cart-title" dir="rtl">
      <p className={styles.eyebrow}>انتخاب‌های شما</p>
      <h1 id="cart-title">سبد خرید</h1>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <p>هنوز محصولی به سبد خرید اضافه نکرده‌اید.</p>
          <Link to="/shop">رفتن به فروشگاه</Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <div>
            <ul className={styles.items}>
              {items.map((item) => <CartLine key={item.key} item={item} />)}
            </ul>
            <Link className={styles.continueShopping} to="/shop">ادامه خرید از فروشگاه</Link>
          </div>
          <aside className={styles.summary} aria-label="خلاصه سفارش">
            <h2>خلاصه سفارش</h2>
            <form className={styles.couponForm} onSubmit={applyCoupon}>
              <label htmlFor="coupon-code">کد تخفیف</label>
              <div>
                <input id="coupon-code" value={couponInput} onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="مثلاً WELCOME10" autoComplete="off" />
                {couponCode
                  ? <button type="button" onClick={removeCoupon}>حذف کد</button>
                  : <button type="submit">اعمال</button>}
              </div>
              <p className={styles.couponHint}>WELCOME10: ده درصد · STYLE15: پانزده درصد برای خرید بالای ۵ میلیون تومان</p>
              {couponMessage && <p className={couponError ? styles.error : styles.success} role={couponError ? "alert" : "status"}>{couponMessage}</p>}
              {activeCoupon && !activeCoupon.valid && <p className={styles.error} role="alert">{activeCoupon.message}</p>}
            </form>
            <dl className={styles.totals}>
              <div><dt>جمع محصولات</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
              {totals.productSavings > 0 && <div><dt>تخفیف محصولات</dt><dd>− {formatPrice(totals.productSavings)}</dd></div>}
              {couponCode && totals.couponSavings > 0 && <div><dt>تخفیف کد {couponCode}</dt><dd>− {formatPrice(totals.couponSavings)}</dd></div>}
              <div className={styles.total}><dt>مبلغ قابل پرداخت</dt><dd>{formatPrice(totals.total)}</dd></div>
            </dl>
            <p className={styles.shipping}>هزینه ارسال در مرحله ثبت سفارش محاسبه می‌شود.</p>
            <Link className={styles.checkout} to={authenticated ? "/checkout" : "/login?next=%2Fcheckout"}>
              {authenticated ? "ادامه به ثبت سفارش" : "ورود و ادامه به ثبت سفارش"}
            </Link>
            <p className={styles.checkoutNote}>موجودی و قیمت نهایی هنگام ثبت سفارش در سرور بررسی می‌شوند.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
