import Footer from "../../shared/components/layout/Footer/Footer";
import Header from "../../shared/components/layout/Header/Header";
import SmoothScroll from "../../shared/motion/SmoothScroll";
import { useLocation } from "../../shared/router";
import styles from "./MainLayout.module.css";

/** چارچوب مشترک همه صفحه‌ها. انیمیشن ورود با CSS و خروج با Hook‌های Vike (pages/+onPageTransition*.js). */
export default function MainLayout({ children }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <>
      <SmoothScroll />
      <a href="#main" className={styles.skip}>پرش به محتوا</a>
      <Header transparentOnTop={isHome} />
      <main id="main" key={pathname} className={isHome ? styles.main : `${styles.main} ${styles.offset}`}>
        {children}
      </main>
      <Footer />
    </>
  );
}
