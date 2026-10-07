'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '@/app/page.module.css';
import Switch from '@/components/Switch';
import { sharing, useSharing } from '@/lib/sharing';

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

export function SharingFootnote() {
  return (
    <p className={styles.cardText}>
      No name, email or phone number. Not sold or given to anyone.{' '}
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

/** Settings → "Help improve MYCE": the two switches, and deleting what was shared. */
export default function SharingCard() {
  const { settings, deleting, notice } = useSharing();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Help improve MYCE</div>
      <SharingChoice choice="usage" checked={settings.usage === true} onChange={(on) => void sharing.setUsage(on)} />
      <SharingChoice choice="commute" checked={settings.commute === true} onChange={(on) => void sharing.setCommute(on)} />
      <SharingFootnote />
      {settings.installId && !confirming && (
        <button className={styles.secondaryButton} style={{ marginTop: 0, color: 'var(--danger-color)' }} disabled={deleting} onClick={() => setConfirming(true)}>
          Delete commute times I&apos;ve shared
        </button>
      )}
      {confirming && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span>Delete every commute time shared from this phone, and turn commute sharing off? Your trips on this phone stay.</span>
          <div className={styles.bannerActions}>
            <button
              className={styles.linkButton}
              style={{ color: 'var(--danger-color)' }}
              disabled={deleting}
              onClick={async () => {
                if (await sharing.deleteShared()) setConfirming(false);
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button className={styles.linkButton} disabled={deleting} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}
      {notice && (
        <p className={styles.cardText} role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
