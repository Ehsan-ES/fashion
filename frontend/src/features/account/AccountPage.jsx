import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "../../shared/router";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errors";
import { updateMe } from "../auth/authService";
import { useAuthStore } from "../auth/useAuthStore";
import { cancelOrder, fetchOrders } from "./api";
import Invoice from "../orders/Invoice";
import styles from "../auth/auth.module.css";
import pageStyles from "./account.module.css";

const ORDER_STATUS = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
};

const orderDate = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

function OrderCard({ order, onCancel, cancelling }) {
  const [confirming, setConfirming] = useState(false);
  const variant = (item) => [item.color_name, item.size_name].filter(Boolean).join(" · ");

  return (
    <article className={pageStyles.order}>
      <header className={pageStyles.orderHeader}>
        <div className={pageStyles.orderNumber}>
          <span>شماره سفارش</span>
          <bdi dir="ltr">{order.order_number}</bdi>
        </div>
        <span className={pageStyles.status} data-status={order.payment_status === "paid_unfulfilled" ? "cancelled" : order.status}>
          {order.payment_status === "paid_unfulfilled" ? "پرداخت‌شده · نیازمند بررسی" : ORDER_STATUS[order.status] ?? order.status}
        </span>
      </header>
      <div className={pageStyles.orderMeta}>
        <time dateTime={order.created_at}>{orderDate.format(new Date(order.created_at))}</time>
        <strong className={pageStyles.orderTotal}>{formatPrice(order.total)}</strong>
      </div>
      <ul className={pageStyles.items} aria-label="اقلام سفارش">
        {order.items.map((item, index) => (
          <li className={pageStyles.item} key={`${item.sku}-${index}`}>
            <span className={pageStyles.itemName}>
              {item.product_name} · {formatNumber(item.quantity)} عدد
              {variant(item) && <span className={pageStyles.itemVariant}> ({variant(item)})</span>}
            </span>
            <span className={pageStyles.itemPrice}>{formatPrice(item.line_total)}</span>
          </li>
        ))}
      </ul>
      <footer className={pageStyles.orderFooter}>
        <details className={pageStyles.address}>
          <summary>نشانی ارسال</summary>
          <p>
            {order.recipient_name} · <bdi dir="ltr">{order.recipient_phone}</bdi>
            <br />
            {order.province}، {order.city}، {order.address_line} · کد پستی <bdi dir="ltr">{order.postal_code}</bdi>
          </p>
        </details>
        {order.status === "pending" && !confirming && (
          <button type="button" className={pageStyles.cancel} onClick={() => setConfirming(true)}>
            لغو سفارش
          </button>
        )}
        {order.status === "pending" && confirming && (
          <div className={pageStyles.confirm}>
            <span>از لغو این سفارش مطمئن هستید؟</span>
            <button type="button" disabled={cancelling} onClick={() => onCancel(order.order_number)}>
              {cancelling ? "در حال لغو..." : "بله، لغو شود"}
            </button>
            <button type="button" disabled={cancelling} onClick={() => setConfirming(false)}>بازگشت</button>
          </div>
        )}
      </footer>
      <details className={pageStyles.invoiceDetails}>
        <summary>مشاهده و چاپ فاکتور</summary>
        <Invoice order={order} />
      </details>
    </article>
  );
}

function OrdersSection() {
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: fetchOrders, retry: false });
  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  return (
    <section className={pageStyles.orders} aria-labelledby="orders-title">
      <header className={pageStyles.ordersHeader}>
        <h2 id="orders-title">سفارش‌های من</h2>
        {ordersQuery.data && <p className={pageStyles.ordersCount}>{formatNumber(ordersQuery.data.length)} سفارش</p>}
      </header>
      {ordersQuery.isPending && <p className={pageStyles.state} role="status">در حال دریافت سفارش‌ها...</p>}
      {ordersQuery.isError && (
        <div className={pageStyles.state}>
          <p role="alert">{getErrorMessage(ordersQuery.error, "دریافت سفارش‌ها انجام نشد.")}</p>
          <button type="button" className={pageStyles.retry} onClick={() => ordersQuery.refetch()}>تلاش دوباره</button>
        </div>
      )}
      {ordersQuery.isSuccess && ordersQuery.data.length === 0 && (
        <div className={pageStyles.state}>
          <p>هنوز سفارشی ثبت نکرده‌اید.</p>
          <Link to="/shop">مشاهده محصولات</Link>
        </div>
      )}
      {ordersQuery.isSuccess && ordersQuery.data.length > 0 && (
        <div className={pageStyles.orderList}>
          {ordersQuery.data.map((order) => (
            <OrderCard
              key={order.order_number}
              order={order}
              cancelling={cancelMutation.isPending && cancelMutation.variables === order.order_number}
              onCancel={(orderNumber) => cancelMutation.mutate(orderNumber)}
            />
          ))}
        </div>
      )}
      {cancelMutation.isError && (
        <p className={pageStyles.error} role="alert">
          {getErrorMessage(cancelMutation.error, "لغو سفارش انجام نشد. وضعیت سفارش را دوباره بررسی کنید.")}
        </p>
      )}
    </section>
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [form, setForm] = useState({
    first_name: user.first_name, last_name: user.last_name, email: user.email,
  });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      setUser(await updateMe(form));
      setMsg({ type: "ok", text: "اطلاعات ذخیره شد." });
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };
  const paymentResult = new URLSearchParams(location.search).get("payment");

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.heading}>
        <p className={pageStyles.eyebrow}>YOUR BOUTIQUE ACCOUNT</p>
        <h1>حساب کاربری</h1>
      </header>
      {paymentResult && (
        <p className={pageStyles.paymentNotice} role={paymentResult === "failed" ? "alert" : "status"}>
          {paymentResult === "success" && "پرداخت سفارش با موفقیت تأیید شد."}
          {paymentResult === "review" && "پرداخت انجام شده است؛ سفارش برای بررسی موجودی به فروشگاه ارجاع شد."}
          {paymentResult === "failed" && "پرداخت تأیید نشد. می‌توانید از فاکتور سفارش دوباره اقدام کنید."}
        </p>
      )}
      <div className={pageStyles.layout}>
        <section className={pageStyles.profile} aria-labelledby="account-title">
          <h2 id="account-title" className={styles.title}>اطلاعات حساب</h2>
          <p className={styles.hint}>موبایل: <bdi dir="ltr">{user.phone}</bdi></p>
          <form onSubmit={save}>
            {[["first_name", "نام"], ["last_name", "نام خانوادگی"], ["email", "ایمیل"]].map(([name, label]) => (
              <div className={styles.field} key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name} name={name} className={styles.input} value={form[name]} onChange={onChange}
                  type={name === "email" ? "email" : "text"} dir={name === "email" ? "ltr" : undefined}
                />
              </div>
            ))}
            {msg.text && (
              <p role={msg.type === "error" ? "alert" : "status"} className={msg.type === "error" ? styles.error : styles.hint}>
                {msg.text}
              </p>
            )}
            <button className={styles.btn} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره"}</button>
          </form>
          <div className={styles.row}>
            <Link to="/" className={styles.link}>صفحه اصلی</Link>
            <button type="button" className={styles.link} onClick={onLogout}>خروج از حساب</button>
          </div>
        </section>
        <OrdersSection />
      </div>
    </main>
  );
}
