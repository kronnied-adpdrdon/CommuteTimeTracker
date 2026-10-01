import { ReactNode } from 'react';
import styles from '@/app/page.module.css';
import { formatDayLabel, formatDistanceKm, formatDuration, formatTimeRange } from '@/lib/trips/format';
import { Trip, TripDirection } from '@/lib/trips/types';

const TITLES: Record<TripDirection, string> = { work: 'To work', home: 'To home', unknown: 'Trip' };

export function DirectionIcon({ direction, size = 20 }: { direction: TripDirection; size?: number }) {
  if (direction === 'work') {
    // Briefcase: heading to the office.
    return (
      <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M3 13h18"></path></svg>
    );
  }
  if (direction === 'home') {
    return (
      <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V20h14V9.5"></path><path d="M10 20v-5h4v5"></path></svg>
    );
  }
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  );
}

interface TripRowProps {
  trip: Trip;
  /** Show the day as well as the time (Home, Reports); History groups by day instead. */
  showDay?: boolean;
  /** Inside a card that already has side padding. */
  inset?: boolean;
  /** Buttons at the right end of the row, e.g. Edit and Delete. */
  actions?: ReactNode;
  /** Extra content under the row, e.g. an edit form. */
  children?: ReactNode;
}

export default function TripRow({ trip, showDay, inset, actions, children }: TripRowProps) {
  const when = formatTimeRange(trip.startedAt, trip.endedAt);
  return (
    <div>
      <div className={`${styles.tripRow} ${inset ? styles.tripRowInset : ''}`}>
        <div className={styles.tripIcon}>
          <DirectionIcon direction={trip.direction} />
        </div>
        <div className={styles.tripMain}>
          <div className={styles.tripTitle}>{TITLES[trip.direction]}</div>
          <div className={styles.tripSub}>{showDay ? `${formatDayLabel(trip.startedAt)} · ${when}` : when}</div>
        </div>
        <div className={styles.tripStats}>
          <div className={styles.tripDuration}>{formatDuration(trip.durationSeconds)}</div>
          <div className={styles.tripKm}>{formatDistanceKm(trip.distanceMeters)}</div>
        </div>
        {actions && <div className={styles.tripActions}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
