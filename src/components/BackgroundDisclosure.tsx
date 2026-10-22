'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/app/page.module.css';
import { autoTracking, useAutoTracking } from '@/lib/auto';
import { commute } from '@/lib/commute';

/**
 * Google Play's "prominent disclosure": shown in the app before Android's own background-location prompt,
 * saying what is collected, why, and that it happens with the app closed. Used by Settings (a banner) and the
 * first-time setup (`page`: full-size buttons pinned to the bottom of the screen).
 */
export default function BackgroundDisclosure({ onEnabled, onCancel, page = false }: { onEnabled: () => void; onCancel: () => void; page?: boolean }) {
  const [asking, setAsking] = useState(false);
  const [refused, setRefused] = useState(false);
  const { background } = useAutoTracking();

  const allow = async () => {
    setAsking(true);
    const on = await autoTracking.enable();
    setAsking(false);
    if (on) onEnabled();
    else setRefused(true);
  };

  const openPhoneSettings = async () => {
    await autoTracking.returnWhenChanged('background');
    await commute.openSettings();
  };

  // Changed in the phone's settings after a refusal: carry on as if they had allowed it here (checked on return).
  const resuming = useRef(false);
  useEffect(() => {
    if (!refused || !background || resuming.current) return;
    resuming.current = true;
    void autoTracking.enable().then((on) => {
      resuming.current = false;
      if (on) {
        setRefused(false);
        onEnabled();
      }
    });
  }, [refused, background, onEnabled]);

  const text = (
    <>
      <strong>Location in the background</strong>
      <span>
        MYCE collects location data to start and stop your commute automatically when you leave or arrive at Home or the Office, even when the app is closed or not in use. Your location stays on this phone, unless you turn on Share commute times, which shares only the rough area (about 5 km across) where each trip starts and ends.
      </span>
      <span>
        On the next screen, choose <strong>Allow all the time</strong>. MYCE comes back by itself, or press Back. You can turn this off in Settings at any time.
      </span>
      {refused && (
        <span className={styles.fieldError}>
          Automatic start and stop needs location set to &ldquo;Allow all the time&rdquo;. You can change it in the phone&apos;s settings for this app.
        </span>
      )}
    </>
  );

  if (page) {
    return (
      <>
        <div className={styles.banner} role="dialog" aria-label="About automatic start and stop">
          {text}
        </div>
        <div className={styles.setupActions}>
          <button className="btn-primary" disabled={asking} onClick={allow}>{refused ? 'Try again' : 'Continue'}</button>
          {refused && (
            <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={() => void openPhoneSettings()}>Open phone settings</button>
          )}
          <button className={styles.secondaryButton} style={{ marginTop: 0 }} onClick={onCancel}>Not now</button>
        </div>
      </>
    );
  }

  return (
    <div className={styles.banner} role="dialog" aria-label="About automatic start and stop">
      {text}
      <div className={styles.bannerActions} style={{ flexWrap: 'wrap' }}>
        <button className={styles.linkButton} disabled={asking} onClick={allow}>{refused ? 'Try again' : 'Continue'}</button>
        {refused && <button className={styles.linkButton} onClick={() => void openPhoneSettings()}>Open phone settings</button>}
        <button className={styles.linkButton} style={{ color: 'var(--text-secondary)' }} onClick={onCancel}>Not now</button>
      </div>
    </div>
  );
}
