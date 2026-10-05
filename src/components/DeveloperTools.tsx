'use client';

import { useState } from 'react';
import styles from '@/app/page.module.css';
import { AutoDecision, autoTracking } from '@/lib/auto';
import { SCENARIOS, Scenario, runScenario } from '@/lib/auto/scenarios';
import { commute, useCommute } from '@/lib/commute';
import { ReminderKind, notifications } from '@/lib/notifications';
import { setup } from '@/lib/setup';
import { formatTimeOfDay } from '@/lib/trips/format';
import { generateSampleTrips, isSampleTrip } from '@/lib/trips/sample';

const REMINDERS: { kind: ReminderKind; label: string; pro?: boolean }[] = [
  { kind: 'leaveNow', label: 'Time to leave' },
  { kind: 'evening', label: 'Forgot to track' },
  { kind: 'weekly', label: 'Weekly summary' },
  { kind: 'setup', label: 'Set-up reminder' },
  { kind: 'monthly', label: 'Monthly recap', pro: true },
  { kind: 'slowDay', label: 'Slow-day heads-up', pro: true },
];

function describeDecision(d: AutoDecision): string {
  switch (d.action) {
    case 'KEEP':
      return `kept, ${formatTimeOfDay(d.startedAt!)} to ${formatTimeOfDay(d.endedAt!)} (to ${d.direction})`;
    case 'DROP':
      return `dropped: ${d.reason}`;
    case 'START':
      return `waiting for arrival until ${formatTimeOfDay(d.expiresAt!)}`;
    default:
      return `ignored: ${d.reason}`;
  }
}

/**
 * Debug and demo builds only (the caller checks). Everything needed to try the Free and Pro features
 * without waiting: a plan switch, sample trips and addresses, and buttons that fire each reminder now.
 */
export default function DeveloperTools() {
  const state = useCommute();
  const [message, setMessage] = useState<string | null>(null);
  const sampleCount = state.trips.filter(isSampleTrip).length;

  async function tryScenario(scenario: Scenario) {
    try {
      const decision = await runScenario(scenario, autoTracking.simulate);
      setMessage(`${scenario.label}: ${describeDecision(decision)}. Expected: ${scenario.expect}.`);
    } catch {
      setMessage('Automatic start and stop can only be tested in the Android app.');
    }
  }

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
        Clear Home and Office
      </button>
      <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => setup.preview()}>
        Show every first-time setup screen
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

      <div className="eyebrow" style={{ marginTop: '6px' }}>Automatic start and stop</div>
      <p className={styles.cardText}>
        Pretend Home and Office crossings on the last weekday, run through the phone&apos;s real rules. Needs automatic start and stop switched on and both addresses set (sample addresses work). Only the decision is shown: nothing is recorded or saved. For the full path, move the emulator&apos;s location across a circle.
      </p>
      <div className={styles.buttonRow}>
        {SCENARIOS.map((scenario) => (
          <button key={scenario.id} className={styles.pillButton} onClick={() => tryScenario(scenario)}>
            {scenario.label}
          </button>
        ))}
      </div>
      {message && <p className={styles.cardText} role="status">{message}</p>}
    </div>
  );
}
