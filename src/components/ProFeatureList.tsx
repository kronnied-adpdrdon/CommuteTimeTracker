import styles from '@/app/page.module.css';

const Check = ({ color = 'var(--success-color)' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="12" cy="12" r="12" fill={color} />
    <path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="var(--surface-color)" />
  </svg>
);

export const FREE_FEATURES = [
  'Unlimited commute tracking',
  'Your last 3 commutes on the home screen',
  'Last 2 weeks of history, with edit and delete',
  'Home and Office labels, weekly totals',
];

export const PRO_FEATURES = [
  'Reports for any date range, including trips older than 2 weeks',
  'Totals, averages, and to work vs to home',
  'Export as PDF or CSV to share or file a claim',
];

export default function ProFeatureList({ features, color }: { features: string[]; color?: string }) {
  return (
    <ul className={styles.checkList}>
      {features.map((feature) => (
        <li key={feature}>
          <Check color={color} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
