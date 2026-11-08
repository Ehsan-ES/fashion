import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updateMe } from "../auth/authService";
import { useAuthStore } from "../auth/useAuthStore";
import { getErrorMessage } from "../../shared/utils/errors";
import styles from "../auth/auth.module.css";

export default function AccountPage() {
  const navigate = useNavigate();
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

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="account-title">
        <h1 id="account-title" className={styles.title}>حساب کاربری</h1>
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
    </main>
  );
}
