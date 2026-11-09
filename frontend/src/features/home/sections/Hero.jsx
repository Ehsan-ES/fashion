import { useRef } from "react";
import MagneticLink from "../../../shared/motion/MagneticLink";
import { useGsap } from "../../../shared/motion/useGsap";
import { site } from "../../../shared/config/site";
import Hero3D from "./Hero3D";
import styles from "./hero.module.css";

export default function Hero() {
  const ref = useRef(null);

  useGsap((gsap) => {
    gsap.from("[data-hero-line]", { yPercent: 115, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.15 });
    gsap.from("[data-hero-fade]", { opacity: 0, y: 20, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.6 });
    gsap.to("[data-hero-content]", {
      yPercent: 14, opacity: 0.1, ease: "none",
      scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
    });
  }, ref, []);

  return (
    <section ref={ref} className={styles.hero} aria-labelledby="hero-title">
      <Hero3D sourceRef={ref} />
      <div className={styles.content} data-hero-content>
        <p className={styles.eyebrow} data-hero-fade>{site.brand.en}</p>
        <h1 id="hero-title" className={styles.title}>
          <span className={styles.line}><span className={styles.lineInner} data-hero-line>استایلی که</span></span>{" "}
          <span className={styles.line}><span className={styles.lineInner} data-hero-line>با شما می‌ماند</span></span>
        </h1>
        <p className={styles.lead} data-hero-fade>
          کالکشن جدید زنانه و مردانه؛ دوخت دقیق، پارچه‌های باکیفیت و طراحی ساده.
        </p>
        <div className={styles.actions} data-hero-fade>
          <MagneticLink to="/shop?gender=women" className={`${styles.btn} ${styles.btnPrimary}`}>Shop Women</MagneticLink>
          <MagneticLink to="/shop?gender=men" className={styles.btn}>Shop Men</MagneticLink>
        </div>
      </div>
      <p className={styles.cue} aria-hidden="true">اسکرول کنید</p>
    </section>
  );
}
