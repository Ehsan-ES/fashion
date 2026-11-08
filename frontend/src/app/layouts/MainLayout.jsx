import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import Footer from "../../shared/components/layout/Footer/Footer";
import Header from "../../shared/components/layout/Header/Header";
import { scrollToTop } from "../../shared/motion/lenis";
import SmoothScroll from "../../shared/motion/SmoothScroll";
import styles from "./MainLayout.module.css";

const EASE = [0.22, 1, 0.36, 1];

export default function MainLayout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduced = useReducedMotion();
  const isHome = pathname === "/";

  return (
    <>
      <SmoothScroll />
      <a href="#main" className={styles.skip}>پرش به محتوا</a>
      <Header transparentOnTop={isHome} />
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
        <motion.main
          id="main"
          key={pathname}
          className={isHome ? styles.main : `${styles.main} ${styles.offset}`}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
