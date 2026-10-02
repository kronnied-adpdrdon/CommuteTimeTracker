'use client';

import { useState } from 'react';
import styles from '@/app/page.module.css';
import { commute, useCommute } from '@/lib/commute';
import { ReminderKind, notifications } from '@/lib/notifications';
import { generateSampleTrips, isSampleTrip } from '@/lib/trips/sample';

const REMINDERS: { kind: ReminderKind; label: string; pro?: boolean }[] = [
  { kind: 'leaveNow', label: 'Time to leave' },
  { kind: 'evening', label: 'Forgot to track' },
  { kind: 'weekly', label: 'Weekly summary' },
  { kind: 'setup', label: 'Set-up reminder' },
  { kind: 'monthly', label: 'Monthly recap', pro: true },
  { kind: 'slowDay', label: 'Slow-day heads-up', pro: true },
];

/**
 * Debug and demo builds only (the caller checks). Everything needed to try the Free and Pro features
 * without waiting: a plan switch, sample trips and addresses, and buttons that fire each reminder now.
 */
export default function DeveloperTools() {
  const state = useCommute();
  const [message, setMessage] = useState<string | null>(null);
  const sampleCount = state.trips.filter(isSampleTrip).length;

  async function preview(kind: ReminderKind) {
    try {
      const result = await notifications.preview(kind);
      setMessage(
        !result.allowed
          ? 'Notifications are off for this app. Allow them in Settings > Notifications first.'
          : result.sent
            ? 'Sent. Pull down the notification shade.'
            : 'Nothing to send from the current trips; the notification explains why.',
      );
    } catch {
      setMessage('Reminder previews only work in the Android app.');
    }
  }

  return (
    <div className={styles.card} style={{ borderStyle: 'dashed' }}>
      <div className={styles.cardTitle}>Developer tools</div>
      <p className={styles.cardText}>Debug and demo builds only, never in the Play Store version.</p>

      <div className="eyebrow">Plan</div>
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

      <div className="eyebrow" style={{ marginTop: '6px' }}>Sample data</div>
      <p className={styles.cardText}>
        About 10 weeks of weekday trips, slow Tuesdays, last month for the recap, two unlabelled errands, and sample Home and Office addresses. No trip is added for today.
        {sampleCount > 0 ? ` ${sampleCount} sample trips loaded.` : ''}
      </p>
      <button className={styles.secondaryButton} style={{ marginTop: 0 }} disabled={state.phase === 'loading'} onClick={() => commute.loadSampleData(generateSampleTrips(Date.now()))}>
        {sampleCount > 0 ? 'Reload sample trips and addresses' : 'Load sample trips and addresses'}
      </button>
      {sampleCount > 0 && (
        <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => commute.removeSampleData()}>
          Remove sample trips
        </button>
      )}
      <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => commute.resetPlacesPrompt()}>
        Clear Home and Office and show the pop-up again
      </button>

      <div className="eyebrow" style={{ marginTop: '6px' }}>Fire a reminder now</div>
      <div className={styles.buttonRow}>
        {REMINDERS.map(({ kind, label, pro }) => (
          <button key={kind} className={styles.pillButton} onClick={() => preview(kind)}>
            {label}
            {pro && <span className={styles.proBadge}>PRO</span>}
          </button>
        ))}
      </div>
      {message && <p className={styles.cardText} role="status">{message}</p>}
    </div>
  );
}
