import { CSSProperties } from 'react';
import { ICONS, IconName } from '@/lib/insights/icons';

/** One of the Insights line icons, in the current text colour. */
export default function InsightIcon({ name, size = 20, strokeWidth = 2, style }: { name: IconName; size?: number; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={style}>
      <path d={ICONS[name]} />
    </svg>
  );
}
