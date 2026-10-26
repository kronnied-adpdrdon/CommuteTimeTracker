'use client';

import Link from 'next/link';
import styles from '@/app/insights/insights.module.css';
import InsightIcon from '@/components/InsightIcon';
import { useCommute } from '@/lib/commute';
import { useWrapsSeen } from '@/lib/insights/seen';
import { WRAP_ICON, readyTitle, readyWrap } from '@/lib/insights/wraps';
import { useNow } from '@/lib/useNow';

/** "Your October Wrap is ready", for a week after a Wrap comes out and until it's opened. On Home and Insights. */
export default function WrapReadyCard() {
  const { phase, trips } = useCommute();
  const seen = useWrapsSeen();
  const now = useNow();
  if (phase === 'loading' || seen === null) return null;
  const wrap = readyWrap(trips, now, seen);
  if (!wrap) return null;
  return (
    <Link href={`/wrap?id=${wrap.id}`} className={styles.readyCard}>
      <span className={styles.readyIcon}>
        <InsightIcon name={WRAP_ICON[wrap.kind]} size={24} />
      </span>
      <span className={styles.readyText}>
        <span className={styles.readyEyebrow}>New</span>
        <span className={styles.readyTitle}>{readyTitle(wrap)}</span>
        <span className={styles.readyHint}>Tap to see it, then share it</span>
      </span>
      <svg className={styles.readyArrow} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
