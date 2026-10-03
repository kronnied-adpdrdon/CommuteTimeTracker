'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import PageHeader from '@/components/PageHeader';
import Switch from '@/components/Switch';
import { commute, useCommute } from '@/lib/commute';
import { notifications, useNotifications } from '@/lib/notifications';
import { NotificationSettings, clockToMinutes, minutesToClock } from '@/lib/notifications/settings';

interface Row {
  key: keyof NotificationSettings;
  title: string;
  text: string;
  pro?: boolean;
}

const ROWS: Row[] = [
  { key: 'leaveNow', title: 'Time to leave', text: 'A nudge shortly before you usually head out, with how long the trip normally takes. Starts once you have a few trips.' },
  { key: 'evening', title: 'Forgot to track?', text: 'In the evening, only if you usually commute but nothing was logged today.' },
  { key: 'weekly', title: 'Weekly summary', text: 'Sunday evening: your commute time this week and how it compares with last week.' },
  { key: 'monthly', title: 'Monthly recap', text: 'On the 1st: last month’s total commute time, trips and distance.', pro: true },
  { key: 'slowDay', title: 'Slow-day heads-up', text: 'Tells you in the morning when today’s weekday is usually slower for you, so you can leave earlier.', pro: true },
];

export default function NotificationsPage() {
  const { isPro } = useCommute();
  const { settings, allowed } = useNotifications();
  const [testError, setTestError] = useState(false);

  return (
    <>
      <PageHeader title="Notifications" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {allowed === false && (
          <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
            <span>Notifications are turned off for this app, so reminders can&apos;t appear.</span>
            <div className={styles.bannerActions}>
              <button className={styles.linkButton} onClick={() => notifications.requestPermission()}>Allow</button>
              <button className={styles.linkButton} onClick={() => commute.openSettings()}>Open phone settings</button>
            </div>
          </div>
        )}

        <div className={styles.card} style={{ gap: 0 }}>
          {ROWS.map((row, i) => {
            const locked = row.pro && !isPro;
            return (
              <div key={row.key}>
                {i > 0 && <div className={styles.rowDivider} />}
                <div className={styles.settingRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.settingTitle}>
                      {row.title}
                      {row.pro && <span className={styles.proBadge} style={{ marginLeft: '8px' }}>PRO</span>}
                    </div>
                    <div className={styles.cardText}>{row.text}</div>
                    {row.key === 'evening' && settings.evening && (
                      <label className={styles.timeRow}>
                        <span>Remind me at</span>
                        <input
                          className={`input-field ${styles.timeInput}`}
                          type="time"
                          value={minutesToClock(settings.eveningMinutes)}
                          onChange={(e) => {
                            const minutes = clockToMinutes(e.target.value);
                            if (minutes !== null) void notifications.update({ eveningMinutes: minutes });
                          }}
                        />
                      </label>
                    )}
                    {locked && (
                      <Link href="/pricing" className={styles.linkButton} style={{ textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
                        Unlock with Pro
                      </Link>
                    )}
                  </div>
                  <Switch label={row.title} checked={!locked && settings[row.key] === true} onChange={(value) => !locked && notifications.update({ [row.key]: value })} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Check it works</div>
          <p className={styles.cardText}>Reminders are decided on your phone from your own trips. Nothing is sent to a server.</p>
          <button
            className={styles.secondaryButton}
            style={{ marginTop: 0 }}
            onClick={() => notifications.sendTest().then(() => setTestError(false)).catch(() => setTestError(true))}
          >
            Send a test notification
          </button>
          {testError && <p className={styles.fieldError}>Test notifications only work in the Android app.</p>}
        </div>
      </div>
    </>
  );
}
