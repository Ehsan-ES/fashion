import { INFO_PAGES } from "./pages";
import styles from "./InfoPage.module.css";

export default function InfoPage({ slug }) {
  const page = INFO_PAGES[slug];
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>{page.title}</h1>
      {page.paragraphs.map((text) => <p key={text}>{text}</p>)}
      {page.table && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{page.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {page.table.rows.map((row) => (
                <tr key={row[0]}>{row.map((cell, i) => (i === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={cell}>{cell}</td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
