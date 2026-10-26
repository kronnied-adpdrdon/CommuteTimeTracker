import { ReactNode } from 'react';
import styles from '@/app/page.module.css';

/** Line icons for section headings, on the same 24-unit grid as the rest of the app's icons. */
const HEADING_ICONS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  share: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
};

export type HeadingIcon = keyof typeof HEADING_ICONS;

/** The app's one section-heading style: small amber capitals with an icon, and an optional link on the right. */
export function SectionHeading({ icon, children, action }: { icon: HeadingIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sectionHeading}>
      <h2 className={styles.summaryHeader}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {HEADING_ICONS[icon]}
        </svg>
        {children}
      </h2>
      {action}
    </div>
  );
}

export interface Stat {
  value: string;
  label: string;
  /** One line of context under the label. */
  detail?: string;
}

/** A big number, what it is, and one line of context, in equal columns split by dashed lines. */
export function StatStrip({ stats, columns = 3 }: { stats: Stat[]; columns?: 2 | 3 }) {
  return (
    <div className={`${styles.stripGrid} ${columns === 2 ? styles.stripGrid2 : ''}`}>
      {stats.map((s) => (
        <div className={styles.stripStat} key={s.label}>
          <div className={styles.stripValue}>{s.value}</div>
          <div className={styles.stripLabel}>{s.label}</div>
          {s.detail !== undefined && <div className={styles.stripDetail}>{s.detail}</div>}
        </div>
      ))}
    </div>
  );
}
