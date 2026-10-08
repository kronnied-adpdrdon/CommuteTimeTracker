'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../../page.module.css';
import PageHeader from '@/components/PageHeader';
import { commute, useCommute } from '@/lib/commute';

/** Where trips live and how to delete them. */
export default function DataPage() {
  const { trips } = useCommute();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const tripCount = trips.length;

  return (
    <>
      <PageHeader title="Your data" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Trips</div>
          <p className={styles.cardText}>
            {tripCount === 1 ? '1 trip is' : `${tripCount} trips are`} stored on this phone, including any older than the 2 weeks shown in History. If Android backup is on for your Google account, they come back on a new phone.
          </p>
          {tripCount > 0 && !confirmingDelete && (
            <button className={styles.secondaryButton} style={{ marginTop: 0, color: 'var(--danger-color)' }} onClick={() => setConfirmingDelete(true)}>
              Delete all trips
            </button>
          )}
          {confirmingDelete && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <span>Delete all {tripCount} trips? This can&apos;t be undone.</span>
              <div className={styles.bannerActions}>
                <button
                  className={styles.linkButton}
                  style={{ color: 'var(--danger-color)' }}
                  onClick={async () => {
                    await commute.deleteAllTrips();
                    setConfirmingDelete(false);
                  }}
                >
                  Delete all
                </button>
                <button className={styles.linkButton} onClick={() => setConfirmingDelete(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>What you share</div>
          <p className={styles.cardText}>
            Nothing leaves this phone unless you turn it on in{' '}
            <Link href="/settings/sharing" className={styles.linkButton} style={{ padding: 0 }}>Help improve MYCE</Link>. Turning commute sharing off deletes what you shared.
          </p>
          <p className={styles.cardText}>
            To remove everything else (Home, Office and settings), clear the app&apos;s storage in your phone&apos;s settings, or uninstall the app. More in the{' '}
            <Link href="/privacy" className={styles.linkButton} style={{ padding: 0 }}>privacy policy</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
