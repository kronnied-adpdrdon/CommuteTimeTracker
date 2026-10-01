'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { commute, useCommute } from '@/lib/commute';
import { canOpenSettings, errorMessage } from '@/lib/commute/messages';
import { PlaceKind } from '@/lib/trips/edit';
import { DEV_TOOLS } from '@/lib/devtools';
import { ThemePreference, useTheme } from '@/lib/theme';
import { recentTrips } from '@/lib/trips/stats';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const PLACE_LABELS: Record<PlaceKind, string> = { home: 'Home', office: 'Office' };

const card = {
  background: 'var(--surface-color)',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

function PlaceRow({ kind }: { kind: PlaceKind }) {
  const state = useCommute();
  const lastTrip = recentTrips(state.trips, 1)[0];
  const isSet = state.places[kind] !== undefined;
  const busy = state.locating !== null || state.phase === 'loading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
        <span style={{ fontWeight: 600 }}>{PLACE_LABELS[kind]}</span>
        <span style={{ color: isSet ? 'var(--success-color)' : 'var(--text-secondary)' }}>{isSet ? 'Set ✓' : 'Not set'}</span>
      </div>
      <div className={styles.bannerActions} style={{ flexWrap: 'wrap', rowGap: '6px' }}>
        <button className={styles.linkButton} disabled={busy} onClick={() => commute.setPlaceHere(kind)}>
          {state.locating === kind ? 'Finding your location…' : "I'm here now"}
        </button>
        {lastTrip?.start && (
          <button className={styles.linkButton} disabled={busy} onClick={() => commute.setPlace(kind, lastTrip.start!)}>
            Where my last trip started
          </button>
        )}
        {lastTrip?.end && (
          <button className={styles.linkButton} disabled={busy} onClick={() => commute.setPlace(kind, lastTrip.end!)}>
            Where my last trip ended
          </button>
        )}
        {isSet && (
          <button className={styles.linkButton} disabled={busy} onClick={() => commute.setPlace(kind, null)} style={{ color: 'var(--danger-color)' }}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const state = useCommute();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [theme, setTheme] = useTheme();
  const tripCount = state.trips.length;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {state.error && (
          <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
            <span>{errorMessage(state.error)}</span>
            <div className={styles.bannerActions}>
              {canOpenSettings(state.error) && (
                <button className={styles.linkButton} onClick={() => commute.openSettings()}>Open Settings</button>
              )}
              <button className={styles.linkButton} onClick={() => commute.dismissMessages()}>Dismiss</button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={styles.cardTitle}>Your Plan</div>
            {state.isPro ? <span className={styles.proBadge}>PRO</span> : <span className={styles.cardText}>Free</span>}
          </div>
          <p className={styles.cardText}>
            {state.isPro
              ? 'Reports and exports are unlocked. Thanks for supporting the app.'
              : 'Unlock reports for any date range, with PDF and CSV export. ₹49, one-time.'}
          </p>
          {!state.isPro && (
            <Link href="/pricing" className={styles.linkButton} style={{ textDecoration: 'none' }}>
              See what Pro includes
            </Link>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Appearance</div>
          <div className={styles.segmented} role="radiogroup" aria-label="Appearance">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                className={`${styles.segment} ${theme === t.id ? styles.segmentActive : ''}`}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>Home and Office</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Used to label trips as &ldquo;to work&rdquo; or &ldquo;to home&rdquo;. Stored only on this phone.
          </p>
          <PlaceRow kind="home" />
          <div style={{ borderTop: '1px solid var(--border-color)' }} />
          <PlaceRow kind="office" />
        </div>

        <div style={card}>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>Your Data</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {tripCount === 1 ? '1 trip is' : `${tripCount} trips are`} stored on this phone, including any older than the 2 weeks shown in History.
          </p>
          {tripCount > 0 && !confirmingDelete && (
            <button className={styles.secondaryButton} style={{ marginTop: 0, color: 'var(--danger-color)' }} onClick={() => setConfirmingDelete(true)}>
              Delete all trips
            </button>
          )}
          {confirmingDelete && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <span>Delete all {tripCount} trips? This can&apos;t be undone.</span>
              <div className={styles.bannerActions}>
                <button
                  className={styles.linkButton}
                  style={{ color: 'var(--danger-color)' }}
                  onClick={async () => {
                    await commute.deleteAllTrips();
                    setConfirmingDelete(false);
                  }}
                >
                  Delete all
                </button>
                <button className={styles.linkButton} onClick={() => setConfirmingDelete(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {DEV_TOOLS && (
          <div className={styles.card} style={{ borderStyle: 'dashed' }}>
            <div className={styles.cardTitle}>Developer Preview</div>
            <p className={styles.cardText}>Demo builds only. Switches between the Free and Pro screens without a purchase.</p>
            <div className={styles.segmented} role="radiogroup" aria-label="Plan preview">
              {[false, true].map((pro) => (
                <button
                  key={String(pro)}
                  role="radio"
                  aria-checked={state.isPro === pro}
                  className={`${styles.segment} ${state.isPro === pro ? styles.segmentActive : ''}`}
                  onClick={() => commute.setPro(pro)}
                >
                  {pro ? 'Pro' : 'Free'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
