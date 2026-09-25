'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Pricing() {
  const router = useRouter();

  const handleSelect = (plan: string) => {
    // V1: just a mock action
    alert(`Selected plan: ${plan}. Payment gateway would open here in future versions.`);
  };

  return (
    <div className="animate-fade-in">
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ←
        </button>
        <h1 className="title">Upgrade</h1>
      </header>

      <div className={styles.intro}>
        <h2>Unlock Your Data</h2>
        <p>Access your complete work history, generate beautiful reports, and never lose track of your overtime again.</p>
      </div>

      <div className={styles.pricingCards}>
        {/* Single Report */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Single Report</div>
            <div className={styles.cardPrice}>
              <div className={styles.priceAmount}>₹9</div>
              <div className={styles.priceSub}>one-time</div>
            </div>
          </div>
          <ul className={styles.features}>
            <li className={styles.feature}><span className={styles.check}>✓</span> Extract custom date range</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> PDF/Excel format</li>
          </ul>
          <button className="btn-secondary" onClick={() => handleSelect('Single')}>Buy Once</button>
        </div>

        {/* 5-Report Pack */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>5-Report Pack</div>
            <div className={styles.cardPrice}>
              <div className={styles.priceAmount}>₹29</div>
              <div className={styles.priceSub}>one-time</div>
            </div>
          </div>
          <ul className={styles.features}>
            <li className={styles.feature}><span className={styles.check}>✓</span> 5 report extractions</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> Save ₹16</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> Never expires</li>
          </ul>
          <button className="btn-secondary" onClick={() => handleSelect('5-Pack')}>Buy Pack</button>
        </div>

        {/* Pro Annual */}
        <div className={`${styles.card} ${styles.pro}`}>
          <div className={styles.popularBadge}>Best Value</div>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>TOT Pro</div>
            <div className={styles.cardPrice}>
              <div className={styles.priceAmount}>₹99</div>
              <div className={styles.priceSub}>per year</div>
            </div>
          </div>
          <ul className={styles.features}>
            <li className={styles.feature}><span className={styles.check}>✓</span> Unlimited History Access</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> Unlimited Report Exports</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> Cloud Backup</li>
            <li className={styles.feature}><span className={styles.check}>✓</span> Priority Support</li>
          </ul>
          <button className="btn-primary" onClick={() => handleSelect('Pro Annual')}>Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}
