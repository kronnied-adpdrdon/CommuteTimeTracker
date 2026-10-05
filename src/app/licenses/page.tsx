import styles from '@/app/page.module.css';
import PageHeader from '@/components/PageHeader';
import { CREDITS, LICENCE_NAMES, LICENCE_TEXTS, LicenceId } from '@/lib/licenses';

/** Settings → Open-source licences: who made the fonts and libraries the app is built with, and their licences. */
export default function LicensesPage() {
  const used = [...new Set(CREDITS.map((credit) => credit.licence))] as LicenceId[];
  return (
    <>
      <PageHeader title="Open-source licences" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.card}>
          <p className={styles.legalText}>Commute Time Tracker is built with these fonts and open-source libraries. Thank you to the people who make them.</p>
        </div>

        <section className={styles.card}>
          <h2 className={styles.legalHeading}>Credits</h2>
          <ul className={styles.legalList}>
            {CREDITS.map((credit) => (
              <li key={credit.name}>
                <strong>{credit.name}</strong>
                {credit.copyright && <> · {credit.copyright}</>} · {LICENCE_NAMES[credit.licence]}
              </li>
            ))}
          </ul>
        </section>

        {used.map((id) => (
          <details key={id} className={styles.card}>
            <summary className={styles.legalHeading} style={{ cursor: 'pointer' }}>{LICENCE_NAMES[id]}</summary>
            <pre className={styles.licenceText}>{LICENCE_TEXTS[id]}</pre>
          </details>
        ))}
      </div>
    </>
  );
}
