'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { SettingsGroup, SettingsRow } from '@/components/SettingsList';
import { useAutoTracking } from '@/lib/auto';
import { daysSummary } from '@/lib/auto/settings';
import { commute, useCommute } from '@/lib/commute';
import { canOpenSettings, errorMessage } from '@/lib/commute/messages';
import { PRO_PRICE_FALLBACK, inTrial, trialDaysLeft } from '@/lib/commute/trial';
import { useDevTools } from '@/lib/devtools';
import { useSharing } from '@/lib/sharing';
import { ThemePreference, useTheme } from '@/lib/theme';
import { SavedPlace } from '@/lib/trips/direction';
import { formatDayLabel } from '@/lib/trips/format';
import { useNow } from '@/lib/useNow';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/** The part of an address people recognise: "12th Main, Indiranagar, Bengaluru…" becomes "12th Main". */
const shortPlace = (place?: SavedPlace) => (place ? (place.label ?? 'Current location').split(',')[0] : null);

/** The app's version, as Android reports it. Empty in a browser. */
function useAppVersion(): string {
  const [version, setVersion] = useState('');
  useEffect(() => {
    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        setVersion(`${info.version} (${info.build})`);
      } catch {
        // Browser preview: no version to show.
      }
    })();
  }, []);
  return version;
}

/**
 * Settings, structured like the phone's own: the plan on top, then short grouped lists. Each row says what is set
 * now and opens its own screen; only the theme switch is changed in place.
 */
export default function SettingsPage() {
  const state = useCommute();
  const { settings: auto } = useAutoTracking();
  const { settings: sharing } = useSharing();
  const [theme, setTheme] = useTheme();
  const devTools = useDevTools();
  const now = useNow();
  const version = useAppVersion();

  const home = shortPlace(state.places.home);
  const office = shortPlace(state.places.office);
  const placesSummary = home || office ? `Home: ${home ?? 'not set'} · Office: ${office ?? 'not set'}` : 'Not set yet';
  const onOff = (value: boolean | null) => (value ? 'On' : 'Off');
  const tripCount = state.trips.length;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

        <PlanCard now={now} />

        <SettingsGroup title="Commute">
          <SettingsRow icon="pin" title="Home and Office" summary={placesSummary} href="/settings/places" />
          <SettingsRow icon="auto" title="Automatic start and stop" summary={auto.enabled ? `On · ${daysSummary(auto.days)}` : 'Off · tap Start and Stop yourself'} href="/settings/automatic" />
          <SettingsRow icon="bell" title="Notifications" summary="Leave-time, weekly summary and more" href="/notifications" />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <div style={{ padding: '14px 0' }}>
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
        </SettingsGroup>

        <SettingsGroup title="Privacy and data">
          <SettingsRow icon="heart" title="Help improve MYCE" summary={`App usage: ${onOff(sharing.usage)} · Commute times: ${onOff(sharing.commute)}`} href="/settings/sharing" />
          <SettingsRow icon="data" title="Your data" summary={tripCount === 1 ? '1 trip on this phone' : `${tripCount} trips on this phone`} href="/settings/data" />
          <SettingsRow icon="shield" title="Privacy policy" summary="What the app uses and what leaves your phone" href="/privacy" />
        </SettingsGroup>

        <SettingsGroup title="Help">
          <SettingsRow icon="chat" title="Send feedback" summary="Ideas and comments, with screenshots" href="/feedback" />
          <SettingsRow icon="bug" title="Report a bug" summary="Sends a diagnostics log to the developer" href="/report-bug" />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow icon="doc" title="Terms and conditions" href="/terms" />
          <SettingsRow icon="code" title="Open-source licences" summary="The fonts and libraries the app is built with" href="/licenses" />
          <SettingsRow icon="info" title="Version" value={<span className={styles.cardText}>{version || '–'}</span>} />
        </SettingsGroup>

        {devTools && (
          <SettingsGroup title="Testing">
            <SettingsRow icon="wrench" title="Developer tools" summary="Debug and demo builds only" href="/settings/developer" />
          </SettingsGroup>
        )}
      </div>
    </>
  );
}

/** Pro, the free month with its days left, or Free. The card opens Free vs Pro; Restore purchase sits underneath. */
function PlanCard({ now }: { now: number }) {
  const state = useCommute();
  const trial = inTrial(state, now);
  const price = state.proPrice ?? PRO_PRICE_FALLBACK;
  const title = state.isPro ? 'MYCE Pro' : trial ? 'Free month' : 'Free';
  const summary = state.isPro
    ? 'Reports, exports, the monthly recap and slow-day alerts are unlocked. Thank you for supporting the app.'
    : trial
      ? `Everything in Pro is open until ${formatDayLabel(state.trialEndsAt ?? 0)}. Keep it for ${price}, one-time.`
      : `Unlock reports for any date range, PDF and CSV export, the monthly recap and slow-day alerts. ${price}, one-time.`;

  return (
    <div className={styles.card}>
      <Link href="/pricing" className={styles.planCard}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.cardTitle}>{title}</span>
            {state.isPro && <span className={styles.proBadge}>PRO</span>}
            {trial && <span className={styles.cardText}>{trialDaysLeft(state.trialEndsAt ?? 0, now)} days left</span>}
          </div>
          <p className={styles.cardText} style={{ margin: '4px 0 0' }}>{summary}</p>
        </div>
        <svg className={styles.navRowArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
      {!state.isPro && (
        <button className={styles.linkButton} style={{ alignSelf: 'flex-start', padding: 0 }} disabled={state.purchasing} onClick={() => commute.restorePurchases()}>
          {state.purchasing ? 'Checking Google Play…' : 'Already bought it? Restore purchase'}
        </button>
      )}
      {state.notice && <p className={styles.cardText}>{state.notice}</p>}
    </div>
  );
}
