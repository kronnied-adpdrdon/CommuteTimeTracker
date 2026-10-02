'use client';

import Link from 'next/link';
import styles from '../page.module.css';
import PageHeader from '@/components/PageHeader';
import PlanComparison from '@/components/PlanComparison';
import { commute, useCommute } from '@/lib/commute';

export default function PricingPage() {
  const { isPro, proPrice, purchasing, notice } = useCommute();
  const price = proPrice ?? '₹49';

  return (
    <>
      <PageHeader title="Free vs Pro" />

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className={styles.cardText} style={{ padding: '0 4px' }}>
          Pro keeps everything in Free and adds more. Pay once, no subscription.
        </p>

        <PlanComparison price={price} />

        <div className={styles.card}>
          {isPro ? (
            <>
              <div style={{ color: 'var(--success-color)', fontWeight: 700 }}>You have Pro ✓</div>
              <Link href="/reports" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Reports</Link>
            </>
          ) : (
            <>
              <button className="btn-primary btn-gold" disabled={purchasing} onClick={() => commute.upgrade()}>
                {purchasing ? 'Opening Google Play…' : `Upgrade to Pro · ${price}`}
              </button>
              <button className={styles.linkButton} style={{ alignSelf: 'center' }} disabled={purchasing} onClick={() => commute.restorePurchases()}>
                Already bought it? Restore purchase
              </button>
            </>
          )}
          {notice && (
            <div className={styles.banner} role="status">
              <span>{notice}</span>
              <div className={styles.bannerActions}>
                <button className={styles.linkButton} onClick={() => commute.dismissMessages()}>OK</button>
              </div>
            </div>
          )}
          <p className={styles.cardText}>Paid once through Google Play. Restores automatically on any phone with the same Google account.</p>
        </div>
      </div>
    </>
  );
}
