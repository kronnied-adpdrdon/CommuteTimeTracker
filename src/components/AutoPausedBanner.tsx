'use client';

import styles from '@/app/page.module.css';
import { autoTracking, pausedReason, useAutoTracking } from '@/lib/auto';
import { commute } from '@/lib/commute';

/**
 * Automatic start and stop is on but can't work: the location permission was taken back, or location / Google
 * Location Accuracy is off (then the phone never reports leaving Home or the Office). Shown on Home and in Settings.
 */
export default function AutoPausedBanner() {
  const auto = useAutoTracking();
  const reason = pausedReason(auto);
  if (!reason) return null;

  return (
    <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
      {reason === 'permission' ? (
        <span>Automatic start and stop is paused: location is no longer set to &ldquo;Allow all the time&rdquo;.</span>
      ) : (
        <span>
          Automatic start and stop is paused: your phone&apos;s location or Location Accuracy is off, so it can&apos;t tell when you leave or arrive.
        </span>
      )}
      <div className={styles.bannerActions}>
        {reason === 'permission' ? (
          <button
            className={styles.linkButton}
            onClick={async () => {
              await autoTracking.returnWhenChanged('background');
              await commute.openSettings();
            }}
          >
            Open phone settings
          </button>
        ) : (
          <button className={styles.linkButton} onClick={() => void autoTracking.fixAccuracy()}>Turn it on</button>
        )}
      </div>
    </div>
  );
}
