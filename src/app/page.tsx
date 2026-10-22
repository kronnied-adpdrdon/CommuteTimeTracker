'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import RouteLine from '@/components/RouteLine';
import AutoPausedBanner from '@/components/AutoPausedBanner';
import SetupChecklist from '@/components/SetupChecklist';
import { CommutePromptCard } from '@/components/SharingCard';
import { SectionHeading, StatStrip } from '@/components/StatStrip';
import TripRow from '@/components/TripRow';
import { useAutoTracking } from '@/lib/auto';
import { TRIAL_DAYS } from '@/lib/commute/trial';
import { maybeAskForReview } from '@/lib/review';
import { preferencesStore } from '@/lib/storage/preferences';
import { commute, useCommute } from '@/lib/commute';
import { canOpenSettings, errorMessage } from '@/lib/commute/messages';
import { formatClock, formatDayLabel, formatDistanceKm, formatDuration, formatTimeOfDay } from '@/lib/trips/format';
import { USUAL_WEEKS, WeeklySummary, recentTrips, weeklySummary } from '@/lib/trips/stats';

/** This week's average trip against the usual one, in whole minutes; under a minute either way reads as the same. */
function TrendLine({ week }: { week: WeeklySummary }) {
  const muted = { color: 'var(--text-secondary)' };
  if (week.tripCount === 0) return <span style={muted}>No trips yet this week</span>;
  if (week.changeSeconds === null) return <span style={muted}>Compared with your usual trip once you have a few weeks of trips</span>;
  const minutes = Math.round(Math.abs(week.changeSeconds) / 60);
  if (minutes === 0) return <span style={muted}>About the same as your usual trip (last {USUAL_WEEKS} weeks)</span>;
  const quicker = week.changeSeconds < 0;
  return (
    <>
      <span className={quicker ? styles.trendPositive : styles.trendNegative}>
        {quicker ? '↓' : '↑'} {minutes} min {quicker ? 'quicker' : 'slower'}
      </span>{' '}
      <span style={muted}>per trip than your last {USUAL_WEEKS} weeks</span>
    </>
  );
}

/** Shown instead of empty totals until the first trip is saved: what happens next, for automatic or Start and Stop. */
function WelcomeCard({ tracking, autoOn }: { tracking: boolean; autoOn: boolean }) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>Welcome to MYCE</div>
      <p className={styles.welcomeText}>
        {tracking
          ? 'Your first trip is running. It shows up here once it is saved.'
          : autoOn
            ? "You're all set. Your first trip appears here after you go between Home and the Office. No need to tap anything."
            : 'Tap Start Tracking when you leave, and Stop when you arrive. Your first trip appears here.'}
      </p>
      <p className={styles.welcomeHint}>After that, this is where you see your week: total time, your average trip and your quickest.</p>
    </div>
  );
}

/** The current time, refreshed every second while `ticking`. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  return now;
}

export default function Home() {
  const state = useCommute();
  const { phase, session, trips, busy } = state;
  const autoOn = useAutoTracking().settings.enabled;
  const tracking = phase === 'tracking' && session !== null;
  const now = useNow(tracking);

  const elapsedSeconds = tracking ? (now - session.startedAt) / 1000 : 0;
  const distanceMeters = session?.distanceMeters ?? 0;
  const waitingForGps = tracking && !session.hasFix;
  // Started by leaving Home or the Office: it saves itself on arrival, or can be thrown away.
  const auto = tracking && session.auto === true;
  const autoFrom = session?.autoFrom === 'office' ? 'the Office' : 'Home';
  const autoTo = session?.autoFrom === 'office' ? 'Home' : 'the Office';

  // Google's rating card, once, a week after first use (the free month starts on first use).
  const firstUseAt = state.trialEndsAt === null ? null : state.trialEndsAt - TRIAL_DAYS * 24 * 60 * 60 * 1000;
  useEffect(() => {
    if (phase === 'idle') void maybeAskForReview(preferencesStore, { firstUseAt, trips }, Date.now());
  }, [phase, firstUseAt, trips]);

  const week = weeklySummary(trips, new Date(now));
  const recent = recentTrips(trips, 3);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">MYCE</h1>
      </header>

      <div className={styles.homeContainer}>
        {state.error && (
          <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
            <span>{errorMessage(state.error)}</span>
            <div className={styles.bannerActions}>
              {canOpenSettings(state.error) && (
                <button className={styles.linkButton} onClick={() => commute.openSettings()}>
                  Open Settings
                </button>
              )}
              <button className={styles.linkButton} onClick={() => commute.dismissMessages()}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {state.notice && (
          <div className={styles.banner} role="status">
            <span>{state.notice}</span>
            <div className={styles.bannerActions}>
              <button className={styles.linkButton} onClick={() => commute.dismissMessages()}>
                OK
              </button>
            </div>
          </div>
        )}

        {phase !== 'loading' && phase !== 'interrupted' && <SetupChecklist />}
        {phase === 'idle' && <AutoPausedBanner />}

        {phase === 'interrupted' && session ? (
          <div className={`${styles.trackingCard} ${styles.homeHero}`}>
            <div className={styles.trackingPill}>
              Interrupted
            </div>
            <div className={styles.distanceDisplay}>{formatDistanceKm(distanceMeters)}</div>
            <div className={styles.timeLabel}>
              {state.stale
                ? `Your commute from ${formatTimeOfDay(session.startedAt)} was never stopped.`
                : `Your commute from ${formatTimeOfDay(session.startedAt)} was interrupted.`}
            </div>
            {!state.stale && (
              <button className={styles.startButton} disabled={busy} onClick={() => commute.resume()}>
                Resume Tracking
              </button>
            )}
            <button
              className={state.stale ? styles.startButton : styles.secondaryButton}
              disabled={busy}
              onClick={() => commute.finishInterrupted()}
            >
              Save Trip
            </button>
            <button className={styles.secondaryButton} disabled={busy} onClick={() => commute.discardInterrupted()}>
              Discard
            </button>
          </div>
        ) : (
          <div className={`${styles.trackingCard} ${styles.homeHero}`}>
            {tracking ? (
              <div className={`${styles.trackingPill} ${styles.trackingPillLive}`}>{auto ? 'Auto · Tracking' : 'Tracking'}</div>
            ) : (
              <div className={styles.trackingPill}>
                Ready
              </div>
            )}

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.heroValue}>{formatClock(elapsedSeconds)}</div>
                <div className={styles.timeLabel}>Commute time</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.heroValue}>{formatDistanceKm(tracking ? distanceMeters : 0)}</div>
                <div className={styles.timeLabel}>{waitingForGps ? 'Finding GPS…' : 'Distance'}</div>
              </div>
            </div>

            <RouteLine active={tracking} />

            {tracking ? (
              <>
                <button className={styles.stopButton} disabled={busy} onClick={() => commute.stop()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                  {auto ? 'Stop and save' : 'Stop'}
                </button>
                {auto && (
                  <>
                    <button className={styles.secondaryButton} disabled={busy} onClick={() => commute.notCommute()}>
                      Not a commute
                    </button>
                    <p className={styles.hint}>
                      Started automatically when you left {autoFrom} at {formatTimeOfDay(session.startedAt)}. Saves itself when you reach {autoTo}
                      {session.expiresAt ? `, or is dropped as an errand if you're not there by ${formatTimeOfDay(session.expiresAt)}` : ''}.
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <button className={styles.startButton} disabled={busy || phase === 'loading' || state.locating !== null} onClick={() => commute.start()}>
                  Start Tracking
                </button>
                <p className={styles.hint}>
                  {autoOn ? 'Automatic is on: a trip starts by itself when you leave Home or the Office.' : 'Uses your location only while a trip is running.'}
                </p>
              </>
            )}
          </div>
        )}

        {phase === 'idle' && <CommutePromptCard />}

        {phase !== 'loading' && trips.length === 0 ? (
          <WelcomeCard tracking={tracking} autoOn={autoOn} />
        ) : (
          <>
            {/* This Week Summary */}
            <div className={styles.summaryCard}>
              <SectionHeading icon="calendar">This Week</SectionHeading>
              <StatStrip
                stats={[
                  { value: formatDuration(week.totalSeconds), label: 'Total', detail: week.tripCount === 1 ? '1 trip' : `${week.tripCount} trips` },
                  {
                    value: week.avgSecondsPerTrip === null ? '–' : formatDuration(week.avgSecondsPerTrip),
                    label: 'Avg. trip',
                    detail: week.usualSecondsPerTrip === null ? 'this week' : `usual ${formatDuration(week.usualSecondsPerTrip)}`,
                  },
                  {
                    value: week.quickest ? formatDuration(week.quickest.durationSeconds) : '–',
                    label: 'Quickest',
                    detail: week.quickest ? formatDayLabel(week.quickest.startedAt) : 'last 30 days',
                  },
                ]}
              />
              <div className={styles.trendRow}>
                <TrendLine week={week} />
              </div>
            </div>

            {/* Recent Commutes */}
            <div className={styles.historySection}>
              <SectionHeading icon="clock" action={<Link href="/history" className={styles.seeAllBtn}>See All</Link>}>
                Recent Commutes
              </SectionHeading>

              {recent.map((t, i) => (
                <div key={t.id}>
                  {i > 0 && <div className={styles.divider} style={{ marginLeft: '52px' }} />}
                  <TripRow trip={t} showDay inset />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
