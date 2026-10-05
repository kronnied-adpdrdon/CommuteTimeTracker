'use client';

import { useState } from 'react';
import styles from '@/app/page.module.css';
import BackgroundDisclosure from '@/components/BackgroundDisclosure';
import Switch from '@/components/Switch';
import { autoTracking, useAutoTracking } from '@/lib/auto';
import { AutoSettings, MAX_COMMUTE_MINUTES, MAX_RADIUS_METERS, MIN_COMMUTE_MINUTES, MIN_RADIUS_METERS, clampCommute, clampRadius, formatMinutesLong, placesTooClose, toggleDay, waitMinutes } from '@/lib/auto/settings';
import { commute, useCommute } from '@/lib/commute';
import { setup } from '@/lib/setup';
import { clockToMinutes, minutesToClock } from '@/lib/notifications/settings';

/** Monday first, as people read a week. Values are JavaScript weekdays (0 = Sunday). */
export const DAYS: { day: number; label: string; name: string }[] = [
  { day: 1, label: 'M', name: 'Monday' },
  { day: 2, label: 'T', name: 'Tuesday' },
  { day: 3, label: 'W', name: 'Wednesday' },
  { day: 4, label: 'T', name: 'Thursday' },
  { day: 5, label: 'F', name: 'Friday' },
  { day: 6, label: 'S', name: 'Saturday' },
  { day: 0, label: 'S', name: 'Sunday' },
];

type WindowKey = 'morningStart' | 'morningEnd' | 'eveningStart' | 'eveningEnd';

function TimeInput({ value, field, label }: { value: number; field: WindowKey; label: string }) {
  return (
    <input
      aria-label={label}
      className={`input-field ${styles.timeInput}`}
      type="time"
      value={minutesToClock(value)}
      onChange={(e) => {
        const minutes = clockToMinutes(e.target.value);
        if (minutes !== null) void autoTracking.update({ [field]: minutes });
      }}
    />
  );
}

const RADIUS_STEP = 50;
const STEP_BUTTON = { width: '40px', height: '40px', fontSize: '1.25rem', color: 'var(--text-primary)' };

const COMMUTE_STEP = 5;
/** Quick picks, with short labels so all five fit on one line. */
const COMMUTE_PICKS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1½ h' },
];

/**
 * "Your commute usually takes about": − / + in 5-minute steps and a few quick picks. Sets how long a trip that
 * started automatically waits to reach the other place before it counts as an errand.
 */
export function CommuteTimePicker({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const set = (next: number) => onChange(clampCommute(next));
  return (
    <div className={styles.setupStack} style={{ gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
        <span>Usually takes about</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className={styles.iconButton} aria-label="Shorter commute" style={STEP_BUTTON} disabled={minutes <= MIN_COMMUTE_MINUTES} onClick={() => set(minutes - COMMUTE_STEP)}>
            −
          </button>
          <strong style={{ minWidth: '84px', textAlign: 'center' }}>{formatMinutesLong(minutes)}</strong>
          <button className={styles.iconButton} aria-label="Longer commute" style={STEP_BUTTON} disabled={minutes >= MAX_COMMUTE_MINUTES} onClick={() => set(minutes + COMMUTE_STEP)}>
            +
          </button>
        </span>
      </div>
      <div className={styles.commutePicks}>
        {COMMUTE_PICKS.map((pick) => (
          <button key={pick.minutes} aria-pressed={minutes === pick.minutes} className={`${styles.dayPreset} ${minutes === pick.minutes ? styles.dayPresetActive : ''}`} onClick={() => set(pick.minutes)}>
            {pick.label}
          </button>
        ))}
      </div>
      <p className={styles.cardText}>
        A trip that started by itself and hasn&apos;t reached the other place after {formatMinutesLong(waitMinutes(minutes))} is treated as an errand and not saved.
      </p>
    </div>
  );
}

/**
 * − / + buttons rather than a slider: a scroll that starts on a slider moves it, which would silently
 * change the circle.
 */
function RadiusStepper({ settings, kind }: { settings: AutoSettings; kind: 'home' | 'office' }) {
  const field = kind === 'home' ? 'homeRadius' : 'officeRadius';
  const name = kind === 'home' ? 'Home' : 'Office';
  const value = settings[field];
  const set = (next: number) => void autoTracking.update({ [field]: clampRadius(next) });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
      <span>{name} circle</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className={styles.iconButton} aria-label={`Smaller ${name} circle`} style={STEP_BUTTON} disabled={value <= MIN_RADIUS_METERS} onClick={() => set(value - RADIUS_STEP)}>
          −
        </button>
        <strong style={{ minWidth: '64px', textAlign: 'center' }}>{value} m</strong>
        <button className={styles.iconButton} aria-label={`Bigger ${name} circle`} style={STEP_BUTTON} disabled={value >= MAX_RADIUS_METERS} onClick={() => set(value + RADIUS_STEP)}>
          +
        </button>
      </span>
    </div>
  );
}

/** Automatic start and stop: on/off (with the disclosure), commute hours, days and circle sizes. */
export default function AutoTrackingCard() {
  const { settings, loaded, background, supported } = useAutoTracking();
  const { places } = useCommute();
  const [disclosing, setDisclosing] = useState(false);
  const missingPlaces = !places.home || !places.office;
  const tooClose = placesTooClose(places, settings);

  const toggle = (value: boolean) => {
    if (!loaded) return;
    if (!value) {
      setDisclosing(false);
      void autoTracking.update({ enabled: false });
      // A deliberate choice, so the "Finish setting up" card doesn't list it.
      void setup.answer({ recording: 'manual' });
    } else if (background) {
      void autoTracking.update({ enabled: true });
    } else {
      setDisclosing(true);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.settingRow} style={{ padding: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.settingTitle}>Automatic start and stop</div>
          <div className={styles.cardText}>
            Starts a trip when you leave Home or the Office during your commute hours, and saves it when you arrive at the other one. Errands are thrown away, and nothing is watched outside these hours.
          </div>
        </div>
        <Switch label="Automatic start and stop" checked={settings.enabled || disclosing} onChange={toggle} />
      </div>

      {disclosing && <BackgroundDisclosure onEnabled={() => setDisclosing(false)} onCancel={() => setDisclosing(false)} />}
      {supported === false && (
        <p className={styles.fieldError}>This phone doesn&apos;t have Google Play services, which automatic start and stop needs. Start and Stop still work.</p>
      )}
      {settings.enabled && background === false && (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          <span>Paused: location is no longer set to &ldquo;Allow all the time&rdquo;.</span>
          <div className={styles.bannerActions}>
            <button className={styles.linkButton} onClick={() => commute.openSettings()}>Open phone settings</button>
          </div>
        </div>
      )}

      {settings.enabled && (
        <>
          {missingPlaces && <p className={styles.fieldError}>Set both Home and Office above to use this.</p>}
          {tooClose && (
            <p className={styles.fieldError}>
              Home and Office are too close for their circles to tell apart. Make the circles smaller, or check the addresses.
            </p>
          )}

          <div className="eyebrow" style={{ marginTop: '6px' }}>Commute hours</div>
          <label className={styles.timeRow}>
            <span style={{ minWidth: '64px' }}>Morning</span>
            <TimeInput value={settings.morningStart} field="morningStart" label="Morning from" />
            <span>to</span>
            <TimeInput value={settings.morningEnd} field="morningEnd" label="Morning until" />
          </label>
          <label className={styles.timeRow}>
            <span style={{ minWidth: '64px' }}>Evening</span>
            <TimeInput value={settings.eveningStart} field="eveningStart" label="Evening from" />
            <span>to</span>
            <TimeInput value={settings.eveningEnd} field="eveningEnd" label="Evening until" />
          </label>

          <div className={styles.segmented} role="group" aria-label="Commute days" style={{ marginTop: '6px' }}>
            {DAYS.map(({ day, label, name }) => {
              const on = settings.days.includes(day);
              return (
                <button
                  key={day}
                  aria-pressed={on}
                  aria-label={name}
                  className={`${styles.segment} ${on ? styles.segmentActive : ''}`}
                  onClick={() => void autoTracking.update({ days: toggleDay(settings.days, day) })}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="eyebrow" style={{ marginTop: '6px' }}>Commute length</div>
          <CommuteTimePicker minutes={settings.commuteMinutes} onChange={(commuteMinutes) => void autoTracking.update({ commuteMinutes })} />

          <div className="eyebrow" style={{ marginTop: '6px' }}>Circle size</div>
          <RadiusStepper settings={settings} kind="home" />
          <RadiusStepper settings={settings} kind="office" />
          <p className={styles.cardText}>
            A trip starts when you cross the edge of a circle. Make the Office circle bigger if it&apos;s a large campus (300 to 500 m).
          </p>
        </>
      )}
    </div>
  );
}
