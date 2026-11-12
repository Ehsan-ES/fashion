import { useEffect, useRef } from "react";
import { site } from "../../../shared/config/site";
import MagneticLink from "../../../shared/motion/MagneticLink";
import { useGsap } from "../../../shared/motion/useGsap";
import { useHeroStore } from "../../../shared/state/useHeroStore";
import styles from "./hero.module.css";

/**
 * Hero اسکرول‌محور: پیشرفت ScrollTrigger فریم ویدئوی مدل را از ابتدا تا انتها scrub می‌کند.
 */
export default function Hero() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const progress = useRef(0);
  const setActive = useHeroStore((s) => s.setActive);

  useEffect(() => () => setActive(false), [setActive]);

  const syncVideo = () => {
    const video = videoRef.current;
    if (!video || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const targetTime = progress.current * video.duration;
    if (Math.abs(video.currentTime - targetTime) < 1 / 30) return;
    video.currentTime = targetTime;
  };

  useGsap((gsap) => {
    const mobile = window.matchMedia("(max-width: 899px)").matches;

    gsap.from("[data-hero-line]", { yPercent: 115, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.15 });
    gsap.from("[data-hero-fade]", { opacity: 0, y: 20, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.6 });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ref.current,
        start: "top top",
        end: mobile ? "+=170%" : "+=260%",
        pin: true,
        scrub: true,
        anticipatePin: 1,
        refreshPriority: 1,
        onUpdate: (self) => {
          progress.current = self.progress;
          syncVideo();
        },
        onToggle: (self) => setActive(self.isActive),
      },
    });
    tl.to("[data-hero-progress]", { scaleX: 1, duration: 1 }, 0)
      .to("[data-hero-cue]", { opacity: 0, duration: 0.12 }, 0.04);
  }, ref, []);

  return (
    <section ref={ref} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.stage} aria-hidden="true">
        <video
          ref={videoRef}
          className={styles.modelVideo}
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          onLoadedMetadata={syncVideo}
          onSeeked={syncVideo}
        >
          <source src={`${import.meta.env.BASE_URL}models/hero-model.mp4?v=2`} type="video/mp4" />
        </video>
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.text}>
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
          <div className={styles.meter} aria-hidden="true">
            <div className={styles.progress}><span data-hero-progress /></div>
            <p className={styles.cue} data-hero-cue>برای دیدن مدل از همه زاویه‌ها اسکرول کنید</p>
          </div>
        </div>
      </div>
    </section>
  );
}
