'use client';

import styles from '@/app/page.module.css';
import { useAutoTracking } from '@/lib/auto';
import { useCommute } from '@/lib/commute';
import { useNotifications } from '@/lib/notifications';
import { currentFacts, setup, useSetup } from '@/lib/setup';
import { ChecklistItem, checklist } from '@/lib/setup/logic';

const LABELS: Record<ChecklistItem, string> = {
  places: 'Home and Office',
  recording: 'How trips are recorded',
  reminders: 'Reminders',
  battery: 'Battery setting',
};

/** "Finish setting up" on Home: what the first-time setup skipped. Each row reopens that one screen. */
export default function SetupChecklist() {
  const { loaded, progress, wizard } = useSetup();
  // Subscribed so the card updates as each item gets done; the facts are read from these stores.
  useCommute();
  useAutoTracking();
  useNotifications();
  if (!loaded || !progress.closed || progress.checklistHidden || wizard) return null;
  const items = checklist(progress, currentFacts());
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;

  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className={styles.settingTitle}>Finish setting up</div>
        <span className={styles.cardText}>{done} of {items.length} done</span>
      </div>
      <div>
        {items.map(({ item, done: itemDone }) =>
          itemDone ? (
            <div key={item} className={styles.checklistRow} style={{ color: 'var(--text-secondary)' }}>
              <span className={`${styles.checklistMark} ${styles.checklistMarkDone}`} aria-hidden>✓</span>
              <span>{LABELS[item]}</span>
            </div>
          ) : (
            <button key={item} className={styles.checklistRow} onClick={() => setup.openItem(item)}>
              <span className={styles.checklistMark} aria-hidden />
              <span style={{ flex: 1, textAlign: 'left' }}>{LABELS[item]}</span>
              <span aria-hidden style={{ color: 'var(--link)' }}>›</span>
            </button>
          ),
        )}
      </div>
      <button className={styles.linkButton} style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)' }} onClick={() => setup.hideChecklist()}>
        Hide
      </button>
    </div>
  );
}
