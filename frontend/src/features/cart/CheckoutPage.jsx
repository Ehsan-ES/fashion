import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "../../shared/router";
import { useAuthStore } from "../auth/useAuthStore";
import { getErrorMessage } from "../../shared/utils/errors";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import Invoice from "../orders/Invoice";
import { createOrder } from "./api";
import { getCartTotals } from "./discounts";
import { useCartStore } from "./useCartStore";
import styles from "./checkoutPage.module.css";

const EMPTY_ADDRESS = {
  recipient_name: "",
  recipient_phone: "",
  province: "",
  city: "",
  address_line: "",
  postal_code: "",
};
function getCheckoutError(error) {
  const responseData = error?.response?.data;
  const details = responseData?.error?.details ?? responseData;
  const fields = ["items", "coupon_code", "recipient_name", "recipient_phone", "province", "city", "address_line", "postal_code"];
  const detail = fields
    .map((field) => details?.[field])
    .flatMap((messages) => Array.isArray(messages) ? messages : [messages])
    .find((message) => typeof message === "string");
  return detail ?? getErrorMessage(error, "ثبت سفارش انجام نشد. اطلاعات و موجودی محصولات را بررسی کنید.");
}

export default function CheckoutPage() {
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const clearItems = useCartStore((state) => state.clearItems);
  const invalidCart = items.some((item) => !Number.isInteger(item.variantId));
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [error, setError] = useState("");
  const totals = getCartTotals(items, couponCode);
  const estimatedTotal = Math.max(0, totals.subtotal - totals.couponSavings);
  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      clearItems();
      setError("");
      setCompletedOrder(order);
    },
    onError: (requestError) => setError(getCheckoutError(requestError)),
  });
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    setAddress((current) => ({
      ...current,
      recipient_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
      recipient_phone: user?.phone ?? "",
    }));
  }, [user]);

  const updateAddress = (event) => {
    const { name, value } = event.target;
    setAddress((current) => ({ ...current, [name]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    setError("");
    mutation.mutate({
      ...address,
      coupon_code: couponCode,
      items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    });
  };

  if (completedOrder) {
    return (
      <section className={styles.page} dir="rtl" aria-labelledby="checkout-title">
        <div className={styles.complete}>
          <p className={styles.eyebrow}>ORDER RECEIVED</p>
          <h1 id="checkout-title">سفارش شما ثبت شد</h1>
          <p>فاکتور سفارش آماده است. تا تأیید پرداخت، این برگه پیش‌فاکتور محسوب می‌شود.</p>
          <Invoice order={completedOrder} />
          <Link to="/shop">بازگشت به فروشگاه</Link>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className={styles.page} dir="rtl" aria-labelledby="checkout-title">
        <h1 id="checkout-title">ثبت سفارش</h1>
        <div className={styles.empty}>
          <p>سبد خرید خالی است؛ برای ادامه ابتدا محصولی به سبد اضافه کنید.</p>
          <Link to="/shop">رفتن به فروشگاه</Link>
        </div>
      </section>
    );
  }

  if (invalidCart) {
    return (
      <section className={styles.page} dir="rtl" aria-labelledby="checkout-title">
        <h1 id="checkout-title">سبد خرید نیاز به به‌روزرسانی دارد</h1>
        <div className={styles.empty}>
          <p role="alert">برای بررسی موجودی، یک یا چند کالا شناسه‌ی ترکیب محصول ندارند. آن‌ها را از سبد حذف کنید و دوباره از صفحه‌ی محصول انتخاب کنید.</p>
          <Link to="/cart">بازگشت به سبد خرید</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page} dir="rtl" aria-labelledby="checkout-title">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>فقط یک قدم تا سفارش شما</p>
        <h1 id="checkout-title">اطلاعات ارسال</h1>
        <p className={styles.introText}>نشانی تحویل را وارد کنید تا سفارش‌تان با خیال راحت ثبت شود.</p>
        <ol className={styles.steps} aria-label="مراحل خرید">
          <li className={styles.completedStep}><span>۱</span> سبد خرید</li>
          <li className={styles.activeStep} aria-current="step"><span>۲</span> اطلاعات ارسال</li>
          <li><span>۳</span> ثبت سفارش</li>
        </ol>
      </header>
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHeading}>
            <h2>نشانی تحویل سفارش</h2>
            <p>اطلاعات گیرنده و آدرس را بررسی کنید.</p>
          </div>
          <label>
            نام گیرنده
            <input name="recipient_name" value={address.recipient_name} onChange={updateAddress} autoComplete="name" required maxLength={100} />
          </label>
          <label>
            شماره موبایل گیرنده
            <input name="recipient_phone" type="tel" inputMode="tel" dir="ltr" value={address.recipient_phone}
              onChange={updateAddress} autoComplete="tel" required maxLength={16} />
          </label>
          <div className={styles.location}>
            <label>
              استان
              <input name="province" value={address.province} onChange={updateAddress} autoComplete="address-level1" required maxLength={60} />
            </label>
            <label>
              شهر
              <input name="city" value={address.city} onChange={updateAddress} autoComplete="address-level2" required maxLength={60} />
            </label>
          </div>
          <label>
            نشانی کامل
            <textarea name="address_line" value={address.address_line} onChange={updateAddress}
              autoComplete="street-address" required maxLength={300} rows={4} />
          </label>
          <label>
            کد پستی ۱۰ رقمی
            <input name="postal_code" inputMode="numeric" dir="ltr" value={address.postal_code}
              onChange={updateAddress} autoComplete="postal-code" required maxLength={10} />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "در حال ثبت سفارش..." : "ثبت سفارش"}
          </button>
          <p className={styles.note}>موجودی پس از ثبت سفارش برای شما رزرو می‌شود.</p>
        </form>

        <aside className={styles.summary} aria-label="خلاصه سفارش">
          <div className={styles.summaryHeading}>
            <h2>خلاصه سفارش</h2>
            <span>{formatNumber(items.reduce((count, item) => count + item.quantity, 0))} کالا</span>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <span>{item.name} · {item.colorName} · {item.sizeName} × {formatNumber(item.quantity)}</span>
                <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <p><span>جمع محصولات</span><strong>{formatPrice(totals.subtotal)}</strong></p>
          {totals.productSavings > 0 && <p><span>تخفیف محصولات</span><strong>− {formatPrice(totals.productSavings)}</strong></p>}
          {totals.couponSavings > 0 && <p><span>تخفیف {couponCode}</span><strong>− {formatPrice(totals.couponSavings)}</strong></p>}
          <p className={styles.total}><span>مبلغ قابل پرداخت</span><strong>{formatPrice(estimatedTotal)}</strong></p>
          <p className={styles.estimate}>مبلغ نهایی پس از تأیید سرور ثبت می‌شود.</p>
          <Link to="/cart">بازگشت به سبد خرید</Link>
        </aside>
      </div>
    </section>
  );
}
