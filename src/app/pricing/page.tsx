'use client';

import Link from 'next/link';
import styles from '../page.module.css';
import PageHeader from '@/components/PageHeader';
import PlanComparison from '@/components/PlanComparison';
import { commute, useCommute } from '@/lib/commute';
import { PRO_PRICE_FALLBACK, TRIAL_DAYS, inTrial, trialDaysLeft } from '@/lib/commute/trial';
import { formatDayLabel } from '@/lib/trips/format';
import { useNow } from '@/lib/useNow';
import { track } from '@/lib/sharing';

export default function PricingPage() {
  const state = useCommute();
  const { isPro, proPrice, purchasing, notice, trialEndsAt } = state;
  const price = proPrice ?? PRO_PRICE_FALLBACK;
  const now = useNow();
  const trial = inTrial(state, now);

  return (
    <>
      <PageHeader title="Free vs Pro" />

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className={styles.cardText} style={{ padding: '0 4px' }}>
          Everyone gets everything in Pro free for their first {TRIAL_DAYS} days. After that, Free keeps tracking and the last 2 weeks of history; Pro is a single payment, no subscription.
          {trial && trialEndsAt !== null && ` Your free month has ${trialDaysLeft(trialEndsAt, now)} days left (until ${formatDayLabel(trialEndsAt)}). Buying now keeps Pro after that.`}
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
              <button className="btn-primary btn-pro" disabled={purchasing} onClick={() => {
                track({ name: 'upgrade_tap', params: { from: 'plans' } });
                void commute.upgrade();
              }}>
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
