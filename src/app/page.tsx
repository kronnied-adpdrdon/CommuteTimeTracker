'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { commute, useCommute } from '@/lib/commute';
import { LocationError } from '@/lib/tracking/locationSource';
import { totalDistanceMeters } from '@/lib/tracking/tracker';
import { formatClock, formatDayLabel, formatDistanceKm, formatDuration, formatTimeOfDay } from '@/lib/trips/format';
import { recentDays, weeklySummary } from '@/lib/trips/stats';

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

function errorMessage(error: LocationError): string {
  switch (error.kind) {
    case 'permission-denied':
      return 'Location permission is needed to track your commute. Allow it in Settings, then try again.';
    case 'location-off':
      return 'Location is switched off on this phone. Turn it on, then try again.';
    case 'unavailable':
      return 'Tracking only works in the Android app, not in a web browser.';
    default:
      return `Tracking stopped unexpectedly: ${error.message}`;
  }
}

export default function Home() {
  const state = useCommute();
  const { phase, trip, trips, busy } = state;
  const tracking = phase === 'tracking' && trip !== null;
  const now = useNow(tracking);

  const elapsedSeconds = tracking ? (now - trip.startedAt) / 1000 : 0;
  const distanceMeters = trip ? totalDistanceMeters(trip.tracker) : 0;
  const waitingForGps = tracking && trip.tracker.anchor === null;

  const week = weeklySummary(trips, new Date(now));
  const days = recentDays(trips, 5);
  const longestDay = Math.max(1, ...days.map((d) => d.totalSeconds));
  const canOpenSettings = state.error?.kind === 'permission-denied' || state.error?.kind === 'location-off';

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Track Commute</h1>
        <div className="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
      </header>

      <div className={styles.homeContainer}>
        {state.error && (
          <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
            <span>{errorMessage(state.error)}</span>
            <div className={styles.bannerActions}>
              {canOpenSettings && (
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

        {phase === 'interrupted' && trip ? (
          <div className={styles.trackingCard}>
            <div className={styles.trackingPill} style={{ background: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Interrupted
            </div>
            <div className={styles.distanceDisplay}>{formatDistanceKm(distanceMeters)}</div>
            <div className={styles.timeLabel}>
              {state.stale
                ? `Your commute from ${formatTimeOfDay(trip.startedAt)} was never stopped.`
                : `Your commute from ${formatTimeOfDay(trip.startedAt)} was interrupted.`}
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
              <div className={styles.trackingPill}>Tracking...</div>
            ) : (
              <div className={styles.trackingPill} style={{ background: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                Ready
              </div>
            )}

            <div className={styles.timeDisplay}>{formatClock(elapsedSeconds)}</div>
            <div className={styles.timeLabel}>Commute Time</div>

            <div className={styles.distanceDisplay}>{formatDistanceKm(tracking ? distanceMeters : 0)}</div>
            <div className={styles.timeLabel}>{waitingForGps ? 'Finding GPS signal…' : 'Distance Travelled'}</div>

            {tracking ? (
              <button className={styles.stopButton} disabled={busy} onClick={() => commute.stop()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                Stop
              </button>
            ) : (
              <>
                <button className={styles.startButton} disabled={busy || phase === 'loading'} onClick={() => commute.start()}>
                  Start Tracking
                </button>
                <p className={styles.hint}>Uses your location only while a trip is running.</p>
              </>
            )}
          </div>
        )}

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

        {/* Last 5 Days List */}
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitle}>Last 5 Days</div>
            <Link href="/history" className={styles.seeAllBtn}>See All</Link>
          </div>

          {phase !== 'loading' && days.length === 0 && (
            <p className={styles.emptyState}>No trips yet. Tap Start Tracking when you leave.</p>
          )}

          {days.map((day) => (
            <div className={styles.historyRow} key={day.dayKey}>
              <div className={styles.historyDate}>{formatDayLabel(day.dayStart)}</div>
              <div className={styles.historyBar}>
                <div className={styles.historyBarFill} style={{ width: `${(day.totalSeconds / longestDay) * 100}%` }}></div>
              </div>
              <div className={styles.historyTime}>{formatDuration(day.totalSeconds)}</div>
              <div className={styles.historyDist}>{formatDistanceKm(day.totalMeters)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
