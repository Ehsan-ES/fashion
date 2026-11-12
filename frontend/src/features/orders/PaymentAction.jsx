import { useMutation } from "@tanstack/react-query";
import { getErrorMessage } from "../../shared/utils/errors";
import { startOrderPayment } from "../cart/api";
import styles from "./invoice.module.css";

export default function PaymentAction({ orderNumber }) {
  const payment = useMutation({ mutationFn: startOrderPayment });

  return (
    <div className={styles.paymentAction}>
      {!payment.data?.payment_url && (
        <button type="button" disabled={payment.isPending} onClick={() => payment.mutate(orderNumber)}>
          {payment.isPending ? "در حال اتصال به درگاه..." : "پرداخت آنلاین با زرین‌پال"}
        </button>
      )}
      {payment.data?.payment_url && (
        <a href={payment.data.payment_url}>ادامه به درگاه پرداخت</a>
      )}
      {payment.isError && <p role="alert">{getErrorMessage(payment.error, "شروع پرداخت انجام نشد.")}</p>}
    </div>
  );
}
