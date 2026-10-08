'use client';

import styles from '../../page.module.css';
import DeveloperTools from '@/components/DeveloperTools';
import PageHeader from '@/components/PageHeader';
import { useDevTools } from '@/lib/devtools';

export default function DeveloperPage() {
  const devTools = useDevTools();
  return (
    <>
      <PageHeader title="Developer tools" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {devTools ? <DeveloperTools /> : <p className={styles.emptyState}>Only in debug and demo builds.</p>}
      </div>
    </>
  );
}
