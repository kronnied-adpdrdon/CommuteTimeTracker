'use client';

import Link from 'next/link';
import styles from '@/app/page.module.css';
import Switch from '@/components/Switch';
import { useCommute } from '@/lib/commute';
import { sharing, track, useSharing } from '@/lib/sharing';
import { commutePrompt } from '@/lib/sharing/prompt';
import { formatDurationWords } from '@/lib/trips/format';

/** The two choices, worded the same in the setup and in Settings. */
export const SHARING_CHOICES = {
  usage: {
    title: 'Share how you use the app',
    text: 'Which features you use and where setup gets stuck, so confusing parts get fixed. No trips, places or times.',
  },
  commute: {
    title: 'Share commute times',
    text: 'For each trip: how long it took, how far, the start time to the nearest 15 minutes, and the rough area it started and ended in (about 5 km across). Used to map how long commutes take in your city. Never your exact Home, Office or route.',
  },
} as const;

/** What each choice promises about selling: app usage never; commute times only as anonymous totals for 20+ people. */
const SALE_PROMISE = {
  usage: 'Never sold or shared.',
  commute: 'Your trips are never sold or shared; only anonymous totals for groups of 20 or more people may be.',
  both: 'App usage is never sold. Commute times are never sold individually; only anonymous totals for groups of 20 or more people may be.',
};

export function SharingFootnote({ about }: { about: keyof typeof SALE_PROMISE }) {
  return (
    <p className={styles.cardText}>
      {about === 'both' ? 'Turning these on' : 'Turning this on'} confirms you&apos;re 18 or older. No name, email or phone number. {SALE_PROMISE[about]}{' '}
      <Link href="/privacy" className={styles.linkButton} style={{ padding: 0 }}>Privacy policy</Link>
    </p>
  );
}

export function SharingChoice({ choice, checked, onChange }: { choice: keyof typeof SHARING_CHOICES; checked: boolean; onChange: (value: boolean) => void }) {
  const { title, text } = SHARING_CHOICES[choice];
  return (
    <div className={styles.settingRow} style={{ padding: 0, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.settingTitle}>{title}</div>
        <div className={styles.cardText}>{text}</div>
      </div>
      <Switch label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

/** Settings → "Help improve MYCE": the two switches. Turning commute sharing off deletes what was shared. */
export default function SharingCard({ showTitle = true }: { showTitle?: boolean }) {
  const { settings } = useSharing();

  return (
    <div className={styles.card}>
      {showTitle && <div className={styles.cardTitle}>Help improve MYCE</div>}
      <SharingChoice choice="usage" checked={settings.usage === true} onChange={(on) => void sharing.setUsage(on)} />
      <SharingChoice choice="commute" checked={settings.commute === true} onChange={(on) => void sharing.setCommute(on)} />
      {settings.commute === true && <p className={styles.cardText}>Turning commute sharing off also deletes the commute times you&apos;ve shared.</p>}
      {settings.pendingDelete && <p className={styles.cardText} role="status">Deleting what you shared. This finishes next time you&apos;re online.</p>}
      <SharingFootnote about="both" />
    </div>
  );
}

/**
 * Home, once, after the third saved trip: the commute-times question, asked when the user has seen their own trips.
 * "No thanks" is as easy as yes, and either answer hides the card for good (Settings can change it later).
 */
export function CommutePromptCard() {
  const { settings, loaded } = useSharing();
  const { trips } = useCommute();
  const prompt = loaded ? commutePrompt(settings, trips) : null;
  if (!prompt) return null;

  const answer = (on: boolean) => {
    track({ name: 'commute_prompt', params: { answer: on ? 'yes' : 'no' } });
    void sharing.setCommute(on);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Help map commute times in your city</div>
      <p className={styles.cardText}>
        Your last 3 commutes took {formatDurationWords(prompt.averageMinutes * 60)} on average. Want to share times like these? It&apos;s optional.
      </p>
      <p className={styles.cardText}>
        Shared for each trip: how long it took, how far, the start time to the nearest 15 minutes, and the rough area it started and ended in (about 5 km across). Never your exact Home, Office or route. Turning it off later in Settings deletes what you shared.
      </p>
      <SharingFootnote about="commute" />
      <div className={styles.bannerActions} style={{ gap: '12px' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => answer(true)}>Share</button>
        <button className={styles.secondaryButton} style={{ flex: 1, marginTop: 0 }} onClick={() => answer(false)}>No thanks</button>
      </div>
    </div>
  );
}

