import Link from 'next/link';
import styles from '@/app/page.module.css';
import PageHeader from '@/components/PageHeader';
import { LegalDocument } from '@/lib/legal';

/** A privacy policy or terms page. Plain text that works offline; the words live in `lib/legal.ts`. */
export default function LegalPage({ doc, other }: { doc: LegalDocument; other: { href: string; label: string } }) {
  return (
    <>
      <PageHeader title={doc.title} />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.card}>
          <div className="eyebrow">Last updated {doc.updated}</div>
          <p className={styles.legalText}>{doc.intro}</p>
        </div>

        {doc.sections.map((section) => (
          <section key={section.heading} className={styles.card}>
            <h2 className={styles.legalHeading}>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className={styles.legalText}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className={styles.legalList}>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <Link href={other.href} className={styles.linkButton} style={{ alignSelf: 'center', textDecoration: 'none' }}>
          {other.label}
        </Link>
      </div>
    </>
  );
}
