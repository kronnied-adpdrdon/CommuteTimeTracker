'use client';

import styles from '../page.module.css';
import { useCommute } from '@/lib/commute';
import { formatDayLabel, formatDistanceKm, formatDuration, formatTimeRange } from '@/lib/trips/format';
import { groupByDay } from '@/lib/trips/stats';
import { TripDirection } from '@/lib/trips/types';

/** As in the design: a trip to work shows the home icon (where it started), a trip home shows the office icon. */
function DirectionIcon({ direction }: { direction: TripDirection }) {
  if (direction === 'home') {
    return (
      <svg aria-label="Trip home" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
    );
  }
  if (direction === 'work') {
    return (
      <svg aria-label="Trip to work" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
    );
  }
  return (
    <svg aria-label="Trip" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  );
}

export default function HistoryPage() {
  const { trips, phase } = useCommute();
  const days = groupByDay(trips);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">History</h1>
      </header>

      <div className={styles.homeContainer}>
        {phase !== 'loading' && days.length === 0 && (
          <p className={styles.emptyState}>Your trips will appear here once you track your first commute.</p>
        )}

        {days.map((day) => (
          <div key={day.dayKey} style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              {formatDayLabel(day.dayStart, true)}
            </h3>

            <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {day.trips.map((trip, j) => (
                <div key={trip.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: j < day.trips.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    background: 'var(--primary-blue-light)',
                    color: 'var(--primary-blue)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    marginRight: '16px'
                  }}>
                    <DirectionIcon direction={trip.direction} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>{formatTimeRange(trip.startedAt, trip.endedAt)}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {formatDuration(trip.durationSeconds)} <span style={{ color: '#D1D1D6', margin: '0 4px' }}>|</span> {formatDistanceKm(trip.distanceMeters)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
