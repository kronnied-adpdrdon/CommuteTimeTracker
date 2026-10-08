'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import RouteLine from '@/components/RouteLine';
import SetupChecklist from '@/components/SetupChecklist';
import { CommutePromptCard } from '@/components/SharingCard';
import TripRow from '@/components/TripRow';
import { commute, useCommute } from '@/lib/commute';
import { canOpenSettings, errorMessage } from '@/lib/commute/messages';
import { formatClock, formatDistanceKm, formatDuration, formatTimeOfDay } from '@/lib/trips/format';
import { recentTrips, weeklySummary } from '@/lib/trips/stats';

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
  const tracking = phase === 'tracking' && session !== null;
  const now = useNow(tracking);

  const elapsedSeconds = tracking ? (now - session.startedAt) / 1000 : 0;
  const distanceMeters = session?.distanceMeters ?? 0;
  const waitingForGps = tracking && !session.hasFix;
  // Started by leaving Home or the Office: it saves itself on arrival, or can be thrown away.
  const auto = tracking && session.auto === true;
  const autoFrom = session?.autoFrom === 'office' ? 'the Office' : 'Home';
  const autoTo = session?.autoFrom === 'office' ? 'Home' : 'the Office';

  const week = weeklySummary(trips, new Date(now));
  const recent = recentTrips(trips, 3);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Track Commute</h1>
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

        {phase === 'interrupted' && session ? (
          <div className={styles.trackingCard}>
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
          <div className={styles.trackingCard}>
            {tracking ? (
              <div className={`${styles.trackingPill} ${styles.trackingPillLive}`}>{auto ? 'Auto · Tracking' : 'Tracking'}</div>
            ) : (
              <div className={styles.trackingPill}>
                Ready
              </div>
            )}

            <div className={styles.timeDisplay}>{formatClock(elapsedSeconds)}</div>
            <div className={styles.timeLabel}>Commute time</div>

            <div className={styles.distanceDisplay}>{formatDistanceKm(tracking ? distanceMeters : 0)}</div>
            <div className={styles.timeLabel}>{waitingForGps ? 'Finding GPS signal…' : 'Distance travelled'}</div>

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
                <p className={styles.hint}>Uses your location only while a trip is running.</p>
              </>
            )}
          </div>
        )}

        {phase === 'idle' && <CommutePromptCard />}

        {/* This Week Summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            This Week
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{formatDuration(week.totalSeconds)}</div>
              <div className={styles.summaryLabel}>Total Commute Time</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{formatDuration(week.avgSecondsPerDay)}</div>
              <div className={styles.summaryLabel}>Avg. per Day</div>
            </div>
          </div>
          <div className={styles.trendRow}>
            {week.changePercent === null ? (
              <span style={{ color: 'var(--text-secondary)' }}>No trips last week to compare with</span>
            ) : week.changePercent === 0 ? (
              <span style={{ color: 'var(--text-secondary)' }}>Same as previous week</span>
            ) : (
              <>
                <span className={week.changePercent < 0 ? styles.trendPositive : styles.trendNegative}>
                  {week.changePercent < 0 ? '↓' : '↑'} {Math.abs(week.changePercent)}%
                </span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>vs Previous Week</span>
              </>
            )}
          </div>
        </div>

        {/* Recent Commutes */}
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitle}>Recent Commutes</div>
            <Link href="/history" className={styles.seeAllBtn}>See All</Link>
          </div>

          {phase !== 'loading' && recent.length === 0 && (
            <p className={styles.emptyState}>No trips yet. Tap Start Tracking when you leave.</p>
          )}

          {recent.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div className={styles.divider} style={{ marginLeft: '52px' }} />}
              <TripRow trip={t} showDay inset />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
