'use client';

import styles from '../../page.module.css';
import AddressPicker from '@/components/AddressPicker';
import PageHeader from '@/components/PageHeader';

export default function PlacesPage() {
  return (
    <>
      <PageHeader title="Home and Office" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.card}>
          <p className={styles.cardText}>
            Search for an address to label trips &ldquo;to work&rdquo; or &ldquo;to home&rdquo;, and so automatic start and stop knows when you leave. Stored only on this phone.
          </p>
          <AddressPicker kind="home" />
          <AddressPicker kind="office" />
        </div>
      </div>
    </>
  );
}
