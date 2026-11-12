import { useRef, useState } from "react";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import PaymentAction from "./PaymentAction";
import styles from "./invoice.module.css";

const invoiceDate = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "long",
  timeZone: "Asia/Tehran",
});

export default function Invoice({ order }) {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const statusLabel = order.payment_status === "paid_unfulfilled"
    ? "پرداخت‌شده · نیازمند بررسی"
    : order.status === "paid" ? "پرداخت‌شده" : order.status === "cancelled" ? "لغوشده" : "در انتظار پرداخت";
  const displayStatus = order.payment_status === "paid_unfulfilled" ? "cancelled" : order.status;
  const subtotal = Number(order.subtotal);
  const productDiscount = Number(order.product_discount);
  const couponDiscount = Number(order.coupon_discount);
  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await document.fonts?.ready;
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `invoice-${order.order_number}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: [".header", ".metadata", ".customer", "tr", ".totals"] },
        })
        .from(invoiceRef.current)
        .save();
    } catch (error) {
      console.error("Invoice PDF export failed.", error);
      setDownloadError("ساخت فایل PDF انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className={styles.invoice} aria-labelledby="invoice-title" ref={invoiceRef}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>BOUTIQUE</p>
          <h2 id="invoice-title">{order.status === "paid" ? "فاکتور فروش" : "پیش‌فاکتور سفارش"}</h2>
        </div>
        <span className={styles.status} data-status={displayStatus}>{statusLabel}</span>
      </header>

      <dl className={styles.metadata}>
        <div><dt>شماره سفارش</dt><dd><bdi dir="ltr">{order.order_number}</bdi></dd></div>
        <div><dt>تاریخ</dt><dd>{invoiceDate.format(new Date(order.created_at))}</dd></div>
        {order.payment_ref_id && <div><dt>شماره پیگیری پرداخت</dt><dd><bdi dir="ltr">{order.payment_ref_id}</bdi></dd></div>}
      </dl>

      <section className={styles.customer} aria-label="مشخصات گیرنده">
        <h3>مشخصات گیرنده</h3>
        <p>{order.recipient_name} · <bdi dir="ltr">{order.recipient_phone}</bdi></p>
        <p>{order.province}، {order.city}، {order.address_line} · کد پستی <bdi dir="ltr">{order.postal_code}</bdi></p>
      </section>

      <div className={styles.tableWrap}>
        <table className={styles.lines}>
          <thead><tr><th>شرح کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.sku}-${index}`}>
                <td>{item.product_name}<small>{[item.color_name, item.size_name].filter(Boolean).join(" · ")}</small></td>
                <td>{formatNumber(item.quantity)}</td>
                <td>{formatPrice(item.unit_price)}</td>
                <td>{formatPrice(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className={styles.totals}>
        <div><dt>جمع اقلام (پس از تخفیف محصول)</dt><dd>{formatPrice(subtotal)}</dd></div>
        {productDiscount > 0 && <div><dt>صرفه‌جویی تخفیف محصولات</dt><dd>{formatPrice(productDiscount)}</dd></div>}
        {couponDiscount > 0 && <div><dt>تخفیف کد {order.coupon_code}</dt><dd>− {formatPrice(couponDiscount)}</dd></div>}
        <div className={styles.grandTotal}><dt>مبلغ نهایی</dt><dd>{formatPrice(order.total)}</dd></div>
      </dl>

      {order.status === "pending" && (
        <div className={styles.payment} data-html2canvas-ignore="true">
          <p>این برگه تا زمان تأیید پرداخت، پیش‌فاکتور است.</p>
          <PaymentAction orderNumber={order.order_number} />
        </div>
      )}
      {order.payment_status === "paid_unfulfilled" && (
        <p className={styles.warning} role="status">پرداخت تأیید شد؛ سفارش برای بررسی موجودی به فروشگاه ارجاع شده است.</p>
      )}
      <footer className={styles.footer}>
        <span>از خرید شما سپاسگزاریم.</span>
        <button type="button" className={styles.download} onClick={downloadPdf} disabled={downloading}>
          {downloading ? "در حال آماده‌سازی PDF..." : "دانلود فاکتور PDF"}
        </button>
      </footer>
      {downloadError && <p className={styles.downloadError} role="alert">{downloadError}</p>}
    </article>
  );
}
