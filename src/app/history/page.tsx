'use client';

import { useState } from 'react';
import styles from '../page.module.css';
import TripRow from '@/components/TripRow';
import { commute, useCommute } from '@/lib/commute';
import { formatDayLabel, formatTimeOfDay } from '@/lib/trips/format';
import { groupByDay, tripsSince, windowStart } from '@/lib/trips/stats';
import { Trip } from '@/lib/trips/types';

/** History shows this many calendar days, including today. Older trips stay stored for reports. */
const HISTORY_DAYS = 14;

function TripActions({ trip, onDone }: { trip: Trip; onDone: () => void }) {
  const [mode, setMode] = useState<'menu' | 'edit' | 'delete'>('menu');
  const [endClock, setEndClock] = useState(() => formatTimeOfDay(trip.endedAt));
  const [invalid, setInvalid] = useState(false);

  const panel = { padding: '0 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: '8px' };

  if (mode === 'edit') {
    return (
      <div style={panel}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Arrived at (distance stays as recorded)
          <input
            className="input-field"
            type="time"
            value={endClock}
            onChange={(e) => {
              setEndClock(e.target.value);
              setInvalid(false);
            }}
            style={{ marginTop: '6px', padding: '12px' }}
          />
        </label>
        {invalid && (
          <span style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>
            That time doesn&apos;t work: it must be after the trip started ({formatTimeOfDay(trip.startedAt)}) and within 24 hours.
          </span>
        )}
        <div className={styles.bannerActions}>
          <button
            className={styles.linkButton}
            onClick={async () => {
              if (await commute.setTripEndClock(trip.id, endClock)) onDone();
              else setInvalid(true);
            }}
          >
            Save
          </button>
          <button className={styles.linkButton} style={{ color: 'var(--text-secondary)' }} onClick={onDone}>Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'delete') {
    return (
      <div style={panel}>
        <span style={{ fontSize: '0.9rem' }}>Delete this trip? This can&apos;t be undone.</span>
        <div className={styles.bannerActions}>
          <button className={styles.linkButton} style={{ color: 'var(--danger-color)' }} onClick={() => commute.deleteTrip(trip.id)}>
            Delete
          </button>
          <button className={styles.linkButton} style={{ color: 'var(--text-secondary)' }} onClick={onDone}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div className={styles.bannerActions}>
        <button className={styles.linkButton} onClick={() => setMode('edit')}>Change end time</button>
        <button className={styles.linkButton} style={{ color: 'var(--danger-color)' }} onClick={() => setMode('delete')}>Delete</button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { trips, phase } = useCommute();
  const [now] = useState(() => Date.now());
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = tripsSince(trips, windowStart(new Date(now), HISTORY_DAYS));
  const hiddenCount = trips.length - visible.length;
  const days = groupByDay(visible);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">History</h1>
      </header>

      <div className={styles.homeContainer}>
        {phase !== 'loading' && days.length === 0 && (
          <p className={styles.emptyState}>
            {trips.length > 0
              ? 'No trips in the last 2 weeks.'
              : 'Your trips will appear here once you track your first commute.'}
          </p>
        )}

        {days.map((day) => (
          <div key={day.dayKey} style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              {formatDayLabel(day.dayStart, true)}
            </h3>

            <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {day.trips.map((trip, j) => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  divider={j < day.trips.length - 1}
                  onClick={() => setOpenId(openId === trip.id ? null : trip.id)}
                >
                  {openId === trip.id && <TripActions trip={trip} onDone={() => setOpenId(null)} />}
                </TripRow>
              ))}
            </div>
          </div>
        ))}

        {phase !== 'loading' && trips.length > 0 && (
          <p className={styles.hint}>
            Showing the last 2 weeks. Tap a trip to edit or delete it.
            {hiddenCount > 0 &&
              ` ${hiddenCount === 1 ? '1 older trip is' : `${hiddenCount} older trips are`} kept on your phone for reports.`}
          </p>
        )}
      </div>
    </>
  );
}
