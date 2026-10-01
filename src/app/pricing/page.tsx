'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import ProFeatureList, { FREE_FEATURES, PRO_FEATURES } from '@/components/ProFeatureList';
import { commute, useCommute } from '@/lib/commute';

export default function PricingPage() {
  const router = useRouter();
  const { isPro, proPrice, purchasing, notice } = useCommute();
  const price = proPrice ?? '₹49';

  return (
    <>
      <header className="page-header" style={{ justifyContent: 'flex-start', gap: '8px' }}>
        <button
          aria-label="Back"
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="page-title">Plans</h1>
      </header>

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className={styles.cardTitle}>Free</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>₹0</div>
          </div>
          <ProFeatureList features={FREE_FEATURES} />
          {!isPro && <div className={styles.cardText}>Your current plan</div>}
        </div>

        <div className={styles.card} style={{ border: '2px solid var(--pro-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className={styles.cardTitle}>Pro</div>
              <span className={styles.proBadge}>BEST VALUE</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{price}</div>
              <div className={styles.cardText}>one-time</div>
            </div>
          </div>
          <div className={styles.cardText}>Everything in Free, plus:</div>
          <ProFeatureList features={PRO_FEATURES} color="var(--pro-color)" />
          {isPro ? (
            <>
              <div style={{ color: 'var(--success-color)', fontWeight: 700 }}>You have Pro ✓</div>
              <Link href="/reports" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Reports</Link>
            </>
          ) : (
            <button className="btn-primary" disabled={purchasing} onClick={() => commute.upgrade()}>
              {purchasing ? 'Opening Google Play…' : `Upgrade to Pro · ${price}`}
            </button>
          )}
          {notice && (
            <div className={styles.banner} role="status">
              <span>{notice}</span>
              <div className={styles.bannerActions}>
                <button className={styles.linkButton} onClick={() => commute.dismissMessages()}>OK</button>
              </div>
            </div>
          )}
          {!isPro && (
            <button className={styles.linkButton} style={{ alignSelf: 'center' }} disabled={purchasing} onClick={() => commute.restorePurchases()}>
              Already bought it? Restore purchase
            </button>
          )}
          <p className={styles.cardText}>Paid once through Google Play. Restores automatically on any phone with the same Google account.</p>
        </div>
      </div>
    </>
  );
}
