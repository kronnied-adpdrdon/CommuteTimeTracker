'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import AddressPicker from '@/components/AddressPicker';
import { CommuteTimePicker, DAYS } from '@/components/AutoTrackingCard';
import BackgroundDisclosure from '@/components/BackgroundDisclosure';
import RouteLine from '@/components/RouteLine';
import { SharingChoice, SharingFootnote } from '@/components/SharingCard';
import Switch from '@/components/Switch';
import { autoTracking, useAutoTracking } from '@/lib/auto';
import { toggleDay } from '@/lib/auto/settings';
import { commute, useCommute } from '@/lib/commute';
import { notifications, useNotifications } from '@/lib/notifications';
import { clockToMinutes, minutesToClock } from '@/lib/notifications/settings';
import { currentFacts, setup, useSetup } from '@/lib/setup';
import { sharing, track } from '@/lib/sharing';
import { SetupStep, batteryAdvice, checklist, leaveTimeFromWindow, windowFromLeaveTime } from '@/lib/setup/logic';

/**
 * The first-time setup: one question per screen, every screen skippable. Opens by itself until finished or
 * closed (resuming where it stopped), and again for one item at a time from the "Finish setting up" card.
 */
export default function SetupWizard() {
  const { wizard } = useSetup();
  if (!wizard) return null;
  const step = wizard.steps[wizard.index];
  const counted: SetupStep[] = wizard.steps.filter((s) => s !== 'welcome' && s !== 'done');
  const position = counted.indexOf(step);
  const canGoBack = wizard.index > 0 && wizard.steps[wizard.index - 1] !== 'welcome';

  return (
    <div className={styles.setupPage} role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <BackButton canGoBack={canGoBack} single={wizard.single} />
      {position >= 0 && (
        <div className={styles.setupHeader}>
          {canGoBack ? (
            <button className={styles.linkButton} onClick={() => setup.back()}>‹ Back</button>
          ) : (
            <span />
          )}
          {counted.length > 1 && (
            <div className={styles.setupDots} aria-label={`Step ${position + 1} of ${counted.length}`}>
              {counted.map((s, i) => (
                <span key={s} className={`${styles.setupDot} ${i <= position ? styles.setupDotActive : ''} ${i === position ? styles.setupDotCurrent : ''}`} />
              ))}
            </div>
          )}
          <button className={styles.linkButton} style={{ color: 'var(--text-secondary)' }} onClick={() => (wizard.single ? setup.close() : setup.next('skip'))}>
            {wizard.single ? 'Close' : 'Skip'}
          </button>
        </div>
      )}
      {/* Keyed by step so each screen starts scrolled to the top. */}
      <div key={step} className={`${styles.setupContent} ${wizard.direction === 'back' ? styles.setupContentBack : ''}`}>
        {position >= 0 && counted.length > 1 && <div className="eyebrow">Step {position + 1} of {counted.length}</div>}
        <Step step={step} />
      </div>
    </div>
  );
}

/**
 * Android's back button goes back one screen while the setup is showing. On the first screen it closes a
 * single item, or sends the app to the background (the setup resumes there next time).
 */
function BackButton({ canGoBack, single }: { canGoBack: boolean; single: boolean }) {
  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('backButton', () => {
        if (canGoBack) void setup.back();
        else if (single) setup.close();
        else void App.minimizeApp();
      });
      if (cancelled) void listener.remove();
      else remove = () => void listener.remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [canGoBack, single]);
  return null;
}

/** "8:45 AM" or "08:45", following the phone, like the time boxes above it. */
function clock(minutes: number): string {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Step({ step }: { step: SetupStep }) {
  switch (step) {
    case 'welcome':
      return <Welcome />;
    case 'sharing':
      return <Sharing />;
    case 'places':
      return <Places />;
    case 'times':
      return <Times />;
    case 'recording':
      return <Recording />;
    case 'reminders':
      return <Reminders />;
    case 'battery':
      return <Battery />;
    case 'done':
      return <Done />;
  }
}

function Welcome() {
  return (
    <>
      <div className={`${styles.trackingCard} ${styles.setupHero}`}>
        <div className={styles.trackingPill}>MYCE</div>
        <h2 id="setup-title" className={styles.setupHeroTitle}>Know where your commute time goes</h2>
        <RouteLine active />
      </div>
      <div className={styles.setupFeatures}>
        <Feature icon="clock" title="Every trip, timed" text="How long each trip to work and home took, and how far you went." />
        <Feature icon="auto" title="Starts by itself" text="Can start and stop when you leave and arrive, so you don't have to remember." />
        <Feature icon="lock" title="Stays on your phone" text="No account and no sign-in. Your trips stay on this phone unless you choose to share them." />
      </div>
      <div className={styles.setupActions}>
        <button className="btn-primary" onClick={() => setup.next()}>Set up (1 minute)</button>
      </div>
    </>
  );
}

const ICONS = {
  clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>,
  auto: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
};

function Feature({ icon, title, text }: { icon: keyof typeof ICONS; title: string; text: string }) {
  return (
    <div className={styles.setupFeature}>
      <span className={styles.setupFeatureIcon} aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </span>
      <div>
        <div className={styles.settingTitle}>{title}</div>
        <div className={styles.cardText}>{text}</div>
      </div>
    </div>
  );
}

/** "Help improve MYCE": both switches start off; Continue with both off is a full answer. */
function Sharing() {
  const { settings } = sharing.getState();
  const [usage, setUsage] = useState(settings.usage === true);
  const [commuteTimes, setCommuteTimes] = useState(settings.commute === true);

  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>Help improve MYCE</h2>
      <p className={styles.cardText}>Two optional ways to help. Both stay off unless you turn them on, and you can change them or delete what you shared any time in Settings.</p>
      <div className={styles.setupStack}>
        <SharingChoice choice="usage" checked={usage} onChange={setUsage} />
        <SharingChoice choice="commute" checked={commuteTimes} onChange={setCommuteTimes} />
      </div>
      <SharingFootnote />
      <div className={styles.setupActions}>
        <button
          className="btn-primary"
          onClick={async () => {
            await sharing.answer({ usage, commute: commuteTimes });
            await setup.next();
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}

function Places() {
  const { places } = useCommute();
  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>Where do you commute?</h2>
      <p className={styles.cardText}>
        Add Home and Office so trips are labelled &ldquo;to work&rdquo; or &ldquo;to home&rdquo;, and so the app can tell when you leave. They stay on this phone.
      </p>
      <div className={styles.setupStack}>
        <AddressPicker kind="home" />
        <AddressPicker kind="office" />
      </div>
      <div className={styles.setupActions}>
        <button className="btn-primary" disabled={!places.home || !places.office} onClick={() => setup.next()}>Next</button>
      </div>
    </>
  );
}

function Times() {
  const { settings } = useAutoTracking();
  const [leaveHome, setLeaveHome] = useState(() => leaveTimeFromWindow(settings.morningStart));
  const [leaveWork, setLeaveWork] = useState(() => leaveTimeFromWindow(settings.eveningStart));
  const [days, setDays] = useState(settings.days);
  const [commuteMinutes, setCommuteMinutes] = useState(settings.commuteMinutes);
  const morning = windowFromLeaveTime(leaveHome);
  const evening = windowFromLeaveTime(leaveWork);

  const save = async () => {
    await autoTracking.update({ morningStart: morning.start, morningEnd: morning.end, eveningStart: evening.start, eveningEnd: evening.end, days, commuteMinutes });
    await setup.next();
  };

  const timeInput = (value: number, onChange: (minutes: number) => void, label: string) => (
    <input
      aria-label={label}
      className={`input-field ${styles.timeInput}`}
      type="time"
      value={minutesToClock(value)}
      onChange={(e) => {
        const minutes = clockToMinutes(e.target.value);
        if (minutes !== null) onChange(minutes);
      }}
    />
  );

  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>When do you usually leave?</h2>
      <label className={styles.timeRow} style={{ justifyContent: 'space-between' }}>
        <span>Leave home</span>
        {timeInput(leaveHome, setLeaveHome, 'Usually leave home at')}
      </label>
      <label className={styles.timeRow} style={{ justifyContent: 'space-between' }}>
        <span>Leave work</span>
        {timeInput(leaveWork, setLeaveWork, 'Usually leave work at')}
      </label>
      <DayPicker days={days} onChange={setDays} />
      <div className="eyebrow" style={{ marginTop: '10px' }}>How long is the trip?</div>
      <CommuteTimePicker minutes={commuteMinutes} onChange={setCommuteMinutes} />
      <p className={styles.cardText}>
        Trips starting between {clock(morning.start)} and {clock(morning.end)}, or {clock(evening.start)} and {clock(evening.end)}, count as commutes. You can change this in Settings.
      </p>
      <div className={styles.setupActions}>
        <button className="btn-primary" disabled={days.length === 0} onClick={save}>Next</button>
      </div>
    </>
  );
}

const DAY_PRESETS = [
  { label: 'Mon–Fri', days: [1, 2, 3, 4, 5] },
  { label: 'Mon–Sat', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

/** Which days count: quick presets, then a tile per day with its short name. */
function DayPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));
  return (
    <div className={styles.setupStack} style={{ gap: '10px', marginTop: '10px' }}>
      <div className="eyebrow">Which days?</div>
      <div className={styles.dayPresets}>
        {DAY_PRESETS.map((preset) => (
          <button key={preset.label} aria-pressed={same(days, preset.days)} className={`${styles.dayPreset} ${same(days, preset.days) ? styles.dayPresetActive : ''}`} onClick={() => onChange(preset.days)}>
            {preset.label}
          </button>
        ))}
      </div>
      <div className={styles.dayGrid} role="group" aria-label="Commute days">
        {DAYS.map(({ day, name }) => {
          const on = days.includes(day);
          return (
            <button key={day} aria-pressed={on} aria-label={name} className={`${styles.dayTile} ${on ? styles.dayTileOn : ''}`} onClick={() => onChange(toggleDay(days, day))}>
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
      {days.length === 0 && <span className={styles.fieldError}>Pick at least one day.</span>}
    </div>
  );
}

function Recording() {
  const { places } = useCommute();
  const { background, supported } = useAutoTracking();
  const [disclosing, setDisclosing] = useState(false);
  const placesSet = Boolean(places.home && places.office);

  const chooseAuto = async () => {
    if (!placesSet) {
      setup.goTo('places');
    } else if (background) {
      await autoTracking.update({ enabled: true });
      await chosen('auto');
    } else {
      setDisclosing(true);
    }
  };

  const chosen = async (recording: 'auto' | 'manual') => {
    track({ name: 'recording_choice', params: { choice: recording } });
    await setup.answer({ recording });
    await setup.next();
  };

  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>How should trips be recorded?</h2>
      {disclosing ? (
        <BackgroundDisclosure page onEnabled={() => void chosen('auto')} onCancel={() => setDisclosing(false)} />
      ) : (
        <div className={styles.setupStack}>
          <button className={`${styles.choiceCard} ${styles.choiceCardRecommended}`} disabled={supported === false} onClick={chooseAuto}>
            <span className={styles.choiceTitle}>
              Automatically <span className={styles.recommendedBadge}>Recommended</span>
            </span>
            <span className={styles.cardText}>
              Starts when you leave Home or the Office during your commute hours, and saves when you arrive at the other. Errands are ignored.
            </span>
            {supported === false ? (
              <span className={styles.fieldError}>This phone doesn&apos;t have Google Play services, which this needs.</span>
            ) : (
              !placesSet && <span className={styles.choiceNote}>Needs Home and Office first. Tap to add them.</span>
            )}
          </button>
          <button className={styles.choiceCard} onClick={() => chosen('manual')}>
            <span className={styles.choiceTitle}>I&apos;ll tap Start and Stop</span>
            <span className={styles.cardText}>Location is used only while a trip is running. You can switch to automatic later in Settings.</span>
          </button>
        </div>
      )}
    </>
  );
}

const REMINDER_ROWS = [
  { key: 'leaveNow', title: 'Time to leave', text: 'Shortly before you usually head out.' },
  { key: 'evening', title: 'Forgot to track?', text: 'In the evening, if nothing was logged today.' },
  { key: 'weekly', title: 'Weekly summary', text: 'Sunday evening: your week compared with the last.' },
] as const;

function Reminders() {
  const { settings, allowed } = useNotifications();
  const auto = useAutoTracking().settings.enabled;
  const [refused, setRefused] = useState(false);
  const anyOn = REMINDER_ROWS.some((row) => settings[row.key]);
  const needsPermission = (anyOn || auto) && allowed !== true;

  const proceed = async () => {
    if (needsPermission) {
      await notifications.requestPermission();
      if (notifications.getState().allowed === false) {
        setRefused(true);
        return;
      }
    }
    await setup.answer({ reminders: anyOn ? 'on' : 'off' });
    await setup.next();
  };

  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>Reminders</h2>
      <div className={styles.setupStack}>
        {REMINDER_ROWS.map((row) => (
          <div key={row.key} className={styles.settingRow} style={{ padding: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.settingTitle}>{row.title}</div>
              <div className={styles.cardText}>{row.text}</div>
            </div>
            <Switch label={row.title} checked={settings[row.key]} onChange={(value) => void notifications.update({ [row.key]: value })} />
          </div>
        ))}
      </div>
      <p className={styles.cardText}>
        {auto
          ? 'Notifications also show a trip that started by itself, with Stop and Not a commute buttons.'
          : 'More reminders are in Settings → Notifications.'}
      </p>
      {refused && (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          Notifications are off for this app, so reminders can&apos;t appear. You can allow them in the phone&apos;s settings.
        </div>
      )}
      <div className={styles.setupActions}>
        {refused ? (
          <>
            <button className="btn-primary" onClick={() => commute.openSettings()}>Open phone settings</button>
            <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => setup.next()}>Continue without</button>
          </>
        ) : (
          <button className="btn-primary" onClick={proceed}>{needsPermission ? 'Allow notifications' : 'Next'}</button>
        )}
      </div>
    </>
  );
}

function Battery() {
  const { manufacturer } = useSetup();
  const [opened, setOpened] = useState(false);
  const advice = batteryAdvice(manufacturer);
  const brand = advice?.brand ?? 'Your phone';

  return (
    <>
      <h2 id="setup-title" className={styles.setupTitle}>Keep {brand} from stopping the app</h2>
      <p className={styles.cardText}>
        {brand} phones often close apps in the background to save battery. Then a commute can start late, or a reminder can go missing.
      </p>
      <ol className={styles.setupList}>
        <li>Tap <strong>Open app settings</strong>.</li>
        <li>{advice?.advice ?? 'Tap Battery and choose "Unrestricted".'}</li>
        <li>Come back here and tap <strong>Done</strong>.</li>
      </ol>
      <div className={styles.setupActions}>
        {opened ? (
          <button
            className="btn-primary"
            onClick={async () => {
              await setup.answer({ battery: 'done' });
              await setup.next();
            }}
          >
            Done
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => {
              setOpened(true);
              void commute.openSettings();
            }}
          >
            Open app settings
          </button>
        )}
        {opened && (
          <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => commute.openSettings()}>Open app settings again</button>
        )}
      </div>
    </>
  );
}

function Done() {
  const { places } = useCommute();
  const { settings } = useAutoTracking();
  const { progress } = useSetup();
  const placesSet = Boolean(places.home && places.office);
  const recording = settings.enabled ? 'Automatic' : progress.recording === 'manual' ? 'Start and Stop' : 'Not chosen yet';
  const reminders = progress.reminders === 'off' ? 'Off' : notifications.getState().allowed === false ? 'Not allowed yet' : 'On';
  const skipped = checklist(progress, currentFacts()).some((item) => !item.done);

  return (
    <>
      <div className={styles.setupDoneHead}>
        <span className={styles.setupDoneIcon} aria-hidden>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className={styles.setupDoneCheck} d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2 id="setup-title" className={styles.setupTitle}>You&apos;re all set</h2>
      </div>
      <div className={styles.setupSummary}>
        <SummaryRow label="Home and Office" value={placesSet ? 'Set' : 'Not set yet'} ok={placesSet} />
        <SummaryRow label="Recording" value={recording} ok={recording !== 'Not chosen yet'} />
        <SummaryRow label="Reminders" value={reminders} ok={reminders !== 'Not allowed yet'} />
      </div>
      <p className={styles.cardText}>
        {settings.enabled
          ? `Leave home between ${clock(settings.morningStart)} and ${clock(settings.morningEnd)} on a commute day and the trip starts by itself.${reminders === 'Not allowed yet' ? '' : " You'll see a notification when it does."}`
          : 'When you head out, tap Start Tracking. Tip: add the app’s widget to your home screen to start with one tap.'}
        {skipped && ' Anything you skipped is waiting on the Home screen.'}
      </p>
      <div className={styles.setupActions}>
        <button className="btn-primary" onClick={() => setup.next()}>Start using the app</button>
      </div>
    </>
  );
}

function SummaryRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={styles.setupSummaryRow}>
      <span>{label}</span>
      <strong style={{ color: ok ? 'var(--success-color)' : 'var(--text-secondary)' }}>
        {ok ? '✓ ' : ''}
        {value}
      </strong>
    </div>
  );
}
