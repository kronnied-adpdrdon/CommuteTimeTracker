import styles from '@/app/page.module.css';
import { FREE_FEATURES, PRO_FEATURES } from '@/components/ProFeatureList';

const Tick = ({ tone }: { tone: 'free' | 'pro' }) => (
  <svg aria-label="Included" role="img" width="22" height="22" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill={tone === 'pro' ? 'var(--gold)' : 'var(--success-color)'} />
    <path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="var(--surface-color)" />
  </svg>
);

const Dash = () => (
  <span aria-label="Not included" role="img" className={styles.compareDash}>&ndash;</span>
);

/** Free and Pro side by side. Pro ticks every Free feature, then adds its own. */
export default function PlanComparison({ price }: { price: string }) {
  return (
    <div className={`${styles.card} ${styles.compare}`}>
      <div className={styles.compareHead}>
        <div />
        <div className={styles.comparePlan}>
          <div className="eyebrow">Free</div>
          <div className={styles.comparePrice}>&#8377;0</div>
        </div>
        <div className={`${styles.comparePlan} ${styles.comparePlanPro}`}>
          <div className="eyebrow" style={{ color: 'var(--on-gold)' }}>Pro</div>
          <div className={styles.comparePrice}>{price}</div>
          <div className={styles.compareOnce}>one-time</div>
        </div>
      </div>

      <div className={styles.compareGroup}>Everything in Free</div>
      {FREE_FEATURES.map((feature) => (
        <div key={feature} className={styles.compareRow}>
          <div className={styles.compareLabel}>{feature}</div>
          <div className={styles.compareCell}><Tick tone="free" /></div>
          <div className={`${styles.compareCell} ${styles.compareCellPro}`}><Tick tone="pro" /></div>
        </div>
      ))}

      <div className={`${styles.compareGroup} ${styles.compareGroupPro}`}>Plus, only with Pro</div>
      {PRO_FEATURES.map((feature) => (
        <div key={feature} className={`${styles.compareRow} ${styles.compareRowPro}`}>
          <div className={styles.compareLabel}>{feature}</div>
          <div className={styles.compareCell}><Dash /></div>
          <div className={`${styles.compareCell} ${styles.compareCellPro}`}><Tick tone="pro" /></div>
        </div>
      ))}
    </div>
  );
}
