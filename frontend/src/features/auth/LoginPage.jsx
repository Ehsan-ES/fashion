import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage, getRetryAfter } from "../../shared/utils/errors";
import { requestOtp, verifyOtp } from "./authService";
import { useAuthStore } from "./useAuthStore";
import styles from "./auth.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState("phone"); // phone | code
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [debugCode, setDebugCode] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const redirectTo = location.state?.from?.pathname || "/account";
  if (status === "authenticated") return <Navigate to={redirectTo} replace />;

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await requestOtp(phone);
      setDebugCode(data.debug_code ?? null); // فقط وقتی سرور در حالت Mock باشد وجود دارد
      setCooldown(data.resend_after);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
      const wait = getRetryAfter(err);
      if (wait && wait <= 300) setCooldown(wait);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyOtp(phone, code);
      setSession(data.access, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <h1 id="login-title" className={styles.title}>ورود یا ثبت‌نام</h1>

        {step === "phone" ? (
          <form onSubmit={sendCode}>
            <p className={styles.hint}>شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال شود.</p>
            <div className={styles.field}>
              <label htmlFor="phone">شماره موبایل</label>
              <input
                id="phone" className={styles.input} dir="ltr" type="tel" inputMode="tel"
                autoComplete="tel" placeholder="09123456789" value={phone}
                onChange={(e) => setPhone(e.target.value)} required
              />
            </div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button className={styles.btn} disabled={loading || !phone.trim() || cooldown > 0}>
              {loading ? "در حال ارسال..." : cooldown > 0 ? `تلاش مجدد تا ${cooldown} ثانیه` : "دریافت کد"}
            </button>
          </form>
        ) : (
          <form onSubmit={confirm}>
            <p className={styles.hint}>کد ارسال‌شده به <bdi dir="ltr">{phone}</bdi> را وارد کنید.</p>
            {debugCode && <p className={styles.debug} dir="ltr">DEV code: {debugCode}</p>}
            <div className={styles.field}>
              <label htmlFor="code">کد تأیید</label>
              <input
                id="code" className={`${styles.input} ${styles.code}`} dir="ltr" inputMode="numeric"
                autoComplete="one-time-code" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value)} required autoFocus
              />
            </div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button className={styles.btn} disabled={loading || code.trim().length < 6}>
              {loading ? "در حال بررسی..." : "ورود"}
            </button>
            <div className={styles.row}>
              <button type="button" className={styles.link} onClick={() => { setStep("phone"); setError(""); }}>
                ویرایش شماره
              </button>
              <button type="button" className={styles.link} disabled={cooldown > 0 || loading} onClick={sendCode}>
                {cooldown > 0 ? `ارسال مجدد (${cooldown})` : "ارسال مجدد کد"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
