'use client';

import { useState } from 'react';
import styles from '../page.module.css';
import TripRow from '@/components/TripRow';
import { commute, useCommute } from '@/lib/commute';
import { EditProblem, TripForm, speedWarning, tripForm } from '@/lib/trips/edit';
import { formatDistanceKm, formatDuration, formatRelativeDay } from '@/lib/trips/format';
import { summarize } from '@/lib/reports/summary';
import { groupByDay, tripsSince, windowStart } from '@/lib/trips/stats';
import { Trip, TripDirection } from '@/lib/trips/types';

/** History shows this many calendar days, including today. Older trips stay stored for reports. */
const HISTORY_DAYS = 14;

type EditMode = 'edit' | 'delete';

function RowButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <button aria-label="Edit trip" className={styles.iconButton} onClick={onEdit}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
      </button>
      <button aria-label="Delete trip" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={onDelete}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
      </button>
    </>
  );
}

const DIRECTIONS: { id: TripDirection; label: string }[] = [
  { id: 'work', label: 'To work' },
  { id: 'home', label: 'To home' },
  { id: 'unknown', label: 'Other' },
];

const PROBLEMS: Record<EditProblem, string> = {
  'bad-time': 'Please enter both times.',
  'too-long': 'A trip can\u2019t be 24 hours or longer.',
  'in-future': 'The trip can\u2019t end in the future.',
  overlap: 'Those times overlap another trip.',
  'bad-distance': 'Enter the distance in km, for example 12.4.',
};

function TripEditor({ trip, mode, onDone }: { trip: Trip; mode: EditMode; onDone: () => void }) {
  const [form, setForm] = useState(() => tripForm(trip));
  const [problem, setProblem] = useState<EditProblem | null>(null);
  const panel = { padding: '0 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' };
  const label = { fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 };
  const input = { marginTop: '6px', padding: '12px' };

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

  const change = (patch: Partial<TripForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setProblem(null);
  };
  const warning = speedWarning(trip, form);

  return (
    <div style={panel}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <label style={label}>
          Left at
          <input className="input-field" type="time" value={form.startClock} onChange={(e) => change({ startClock: e.target.value })} style={input} />
        </label>
        <label style={label}>
          Arrived at
          <input className="input-field" type="time" value={form.endClock} onChange={(e) => change({ endClock: e.target.value })} style={input} />
        </label>
      </div>
      <label style={label}>
        Distance (km)
        <input
          className="input-field"
          type="text"
          inputMode="decimal"
          value={form.distanceKm}
          onChange={(e) => change({ distanceKm: e.target.value })}
          style={input}
        />
      </label>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Changing the times doesn&apos;t change the distance. The route isn&apos;t saved, so only you can correct it.
      </span>
      <div className={styles.segmented} role="radiogroup" aria-label="Trip direction">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            role="radio"
            aria-checked={form.direction === d.id}
            className={`${styles.segment} ${form.direction === d.id ? styles.segmentActive : ''}`}
            onClick={() => change({ direction: d.id })}
          >
            {d.label}
          </button>
        ))}
      </div>
      {warning && !problem && (
        <span style={{ color: 'var(--link)', fontSize: '0.85rem' }}>
          {warning.kind === 'fast'
            ? `That works out to ${warning.kmh} km/h. Check the times and distance.`
            : `That works out to ${warning.kmh} km/h, slower than walking. Check the times and distance.`}
        </span>
      )}
      {problem && <span style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{PROBLEMS[problem]}</span>}
      <div className={styles.bannerActions}>
        <button
          className={styles.linkButton}
          onClick={async () => {
            const result = await commute.editTrip(trip.id, form);
            if (result) setProblem(result);
            else onDone();
          }}
        >
          Save
        </button>
        <button className={styles.linkButton} style={{ color: 'var(--text-secondary)' }} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { trips, phase } = useCommute();
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState<{ id: string; mode: EditMode } | null>(null);

  const visible = tripsSince(trips, windowStart(new Date(now), HISTORY_DAYS));
  const hiddenCount = trips.length - visible.length;
  const days = groupByDay(visible);
  const totals = summarize(visible);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">History</h1>
      </header>

      <div className={styles.homeContainer}>
        {phase !== 'loading' && visible.length > 0 && (
          <div className={styles.historySummary} aria-label="Last 2 weeks">
            <div className={styles.historySummaryItem}>
              <div className={styles.historySummaryValue}>{totals.tripCount}</div>
              <div className={styles.historySummaryLabel}>Trips</div>
            </div>
            <div className={styles.historySummaryItem}>
              <div className={styles.historySummaryValue}>{formatDuration(totals.totalSeconds)}</div>
              <div className={styles.historySummaryLabel}>Time</div>
            </div>
            <div className={styles.historySummaryItem}>
              <div className={styles.historySummaryValue}>{formatDistanceKm(totals.totalMeters)}</div>
              <div className={styles.historySummaryLabel}>Distance</div>
            </div>
          </div>
        )}

        {phase !== 'loading' && days.length === 0 && (
          <p className={styles.emptyState}>
            {trips.length > 0
              ? 'No trips in the last 2 weeks.'
              : 'Your trips will appear here once you track your first commute.'}
          </p>
        )}

        {days.map((day) => (
          <section key={day.dayKey}>
            <div className={styles.dayHeader}>
              <span className={styles.dayTitle}>{formatRelativeDay(day.dayStart, now)}</span>
              <span className={styles.dayMeta}>
                {day.trips.length} {day.trips.length === 1 ? 'trip' : 'trips'} · {formatDuration(day.totalSeconds)} · {formatDistanceKm(day.totalMeters)}
              </span>
            </div>

            <div className={styles.dayCard}>
              {day.trips.map((trip, j) => (
                <div key={trip.id}>
                  {j > 0 && <div className={styles.divider} />}
                  <TripRow
                    trip={trip}
                    actions={
                      <RowButtons
                        onEdit={() => setEditing({ id: trip.id, mode: 'edit' })}
                        onDelete={() => setEditing({ id: trip.id, mode: 'delete' })}
                      />
                    }
                  >
                    {editing?.id === trip.id && (
                      <TripEditor key={editing.mode} trip={trip} mode={editing.mode} onDone={() => setEditing(null)} />
                    )}
                  </TripRow>
                </div>
              ))}
            </div>
          </section>
        ))}

        {phase !== 'loading' && trips.length > 0 && (
          <p className={styles.hint}>
            Showing the last 2 weeks.
            {hiddenCount > 0 &&
              ` ${hiddenCount === 1 ? '1 older trip is' : `${hiddenCount} older trips are`} kept on your phone for reports.`}
          </p>
        )}
      </div>
    </>
  );
}
