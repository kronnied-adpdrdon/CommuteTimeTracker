import { ReactNode } from 'react';
import { formatDayLabel, formatDistanceKm, formatDuration, formatTimeRange } from '@/lib/trips/format';
import { Trip, TripDirection } from '@/lib/trips/types';

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

interface TripRowProps {
  trip: Trip;
  /** Show the day as well as the time (Home's recent list); History groups by day instead. */
  showDay?: boolean;
  divider?: boolean;
  onClick?: () => void;
  /** Extra content under the row, e.g. edit controls. */
  children?: ReactNode;
  /** Inside a card that already has side padding. */
  inset?: boolean;
  /** Buttons shown at the right end of the row, e.g. Edit and Delete. */
  actions?: ReactNode;
}

export default function TripRow({ trip, showDay, divider, onClick, children, inset, actions }: TripRowProps) {
  return (
    <div style={{ borderBottom: divider ? '1px solid var(--border-color)' : 'none' }}>
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        style={{ display: 'flex', alignItems: 'center', padding: inset ? '12px 0' : '16px', cursor: onClick ? 'pointer' : 'default' }}
      >
        <div style={{
          width: '40px', height: '40px', flexShrink: 0,
          borderRadius: '50%',
          background: 'var(--primary-blue-light)',
          color: 'var(--primary-blue)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          marginRight: '16px'
        }}>
          <DirectionIcon direction={trip.direction} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>
            {showDay ? `${formatDayLabel(trip.startedAt)} · ` : ''}{formatTimeRange(trip.startedAt, trip.endedAt)}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {formatDuration(trip.durationSeconds)} <span style={{ color: 'var(--divider-muted)', margin: '0 4px' }}>|</span> {formatDistanceKm(trip.distanceMeters)}
          </div>
        </div>
        {actions && <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
