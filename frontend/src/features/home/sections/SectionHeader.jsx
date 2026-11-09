import Reveal from "../../../shared/motion/Reveal";
import { Link } from "../../../shared/router";
import styles from "./sections.module.css";

export default function SectionHeader({ id, eyebrow, title, to, cta = "مشاهده همه", children }) {
  return (
    <Reveal className={styles.head}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {children}
        <h2 id={id} className={styles.title}>{title}</h2>
      </div>
      {to && <Link to={to} className={styles.more}>{cta}</Link>}
    </Reveal>
  );
}
