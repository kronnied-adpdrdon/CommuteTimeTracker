'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { commute, useCommute } from '@/lib/commute';
import { canOpenSettings, errorMessage } from '@/lib/commute/messages';
import AddressPicker from '@/components/AddressPicker';
import AutoTrackingCard from '@/components/AutoTrackingCard';
import DeveloperTools from '@/components/DeveloperTools';
import { useDevTools } from '@/lib/devtools';
import { ThemePreference, useTheme } from '@/lib/theme';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const Arrow = () => (
  <svg className={styles.navRowArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

function NavRow({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  const content = (
    <>
      <span className={styles.navRowText}>
        {title}
        <span className={styles.navRowSub}>{subtitle}</span>
      </span>
      <Arrow />
    </>
  );
  return <Link href={href} className={styles.navRow}>{content}</Link>;
}

export default function SettingsPage() {
  const state = useCommute();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [theme, setTheme] = useTheme();
  const devTools = useDevTools();
  const tripCount = state.trips.length;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              : 'Unlock reports for any date range, PDF and CSV export, plus the monthly recap and slow-day alerts. ₹49, one-time.'}
          </p>
          <div className={styles.bannerActions} style={{ flexWrap: 'wrap', rowGap: '6px' }}>
            {!state.isPro && (
              <Link href="/pricing" className={styles.linkButton} style={{ textDecoration: 'none' }}>
                See what Pro includes
              </Link>
            )}
            <button className={styles.linkButton} disabled={state.purchasing} onClick={() => commute.restorePurchases()}>
              {state.purchasing ? 'Checking Google Play…' : 'Restore purchase'}
            </button>
          </div>
          {state.notice && <p className={styles.cardText}>{state.notice}</p>}
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

        <div className={styles.card}>
          <div className={styles.cardTitle}>Home and Office</div>
          <p className={styles.cardText}>
            Search for an address to label trips &ldquo;to work&rdquo; or &ldquo;to home&rdquo;. Stored only on this phone.
          </p>
          <AddressPicker kind="home" />
          <AddressPicker kind="office" />
        </div>

        <AutoTrackingCard />

        <div className={styles.card} style={{ gap: 0, paddingTop: '8px', paddingBottom: '8px' }}>
          <NavRow href="/notifications" title="Notifications" subtitle="Leave-time, weekly summary and more" />
          <div className={styles.rowDivider} />
          <NavRow href="/feedback" title="Send feedback" subtitle="Ideas and comments, with screenshots" />
          <div className={styles.rowDivider} />
          <NavRow href="/report-bug" title="Report a bug" subtitle="Sends a diagnostics log to the developer" />
          <div className={styles.rowDivider} />
          <NavRow href="/privacy" title="Privacy policy" subtitle="What the app uses and what leaves your phone" />
          <div className={styles.rowDivider} />
          <NavRow href="/terms" title="Terms and conditions" subtitle="The rules for using the app" />
          <div className={styles.rowDivider} />
          <NavRow href="/licenses" title="Open-source licences" subtitle="The fonts and libraries the app is built with" />
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Your Data</div>
          <p className={styles.cardText}>
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

        {devTools && <DeveloperTools />}
      </div>
    </>
  );
}
