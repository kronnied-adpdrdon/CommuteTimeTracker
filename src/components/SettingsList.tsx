import Link from 'next/link';
import { ReactNode } from 'react';
import styles from '@/app/page.module.css';

/** Line icons for Settings rows, drawn on a 24-unit grid like the rest of the app's icons. */
const ICONS = {
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  auto: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5" /></>,
  bell: <><path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  data: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  chat: <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />,
  bug: <><rect x="8" y="7" width="8" height="13" rx="4" /><path d="M12 11v9M8 12H4M20 12h-4M8 17H5M19 17h-3M9 4l1.5 2.5M15 4l-1.5 2.5" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
};

export type SettingsIcon = keyof typeof ICONS;

const Arrow = () => (
  <svg className={styles.navRowArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/** A small heading, then a card holding rows separated by dashed lines. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.settingsGroup} aria-label={title}>
      <h2 className={`eyebrow ${styles.settingsGroupTitle}`}>{title}</h2>
      <div className={`${styles.card} ${styles.settingsList}`}>{children}</div>
    </section>
  );
}

/** One row: icon, title, a short summary of the current choice, and an arrow when it opens another screen. */
export function SettingsRow({ icon, title, summary, href, value }: { icon: SettingsIcon; title: string; summary?: string; href?: string; value?: ReactNode }) {
  const content = (
    <>
      <span className={styles.settingsIcon} aria-hidden>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </span>
      <span className={styles.navRowText}>
        {title}
        {summary && <span className={styles.navRowSub}>{summary}</span>}
      </span>
      {value}
      {href && <Arrow />}
    </>
  );
  return href ? (
    <Link href={href} className={styles.navRow}>{content}</Link>
  ) : (
    <div className={styles.navRow} style={{ cursor: 'default' }}>{content}</div>
  );
}
