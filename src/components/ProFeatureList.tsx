import styles from '@/app/page.module.css';

const Check = ({ color = 'var(--success-color)' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="12" cy="12" r="12" fill={color} />
    <path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="var(--surface-color)" />
  </svg>
);

/** What every user gets. Pro includes all of it. */
export const FREE_FEATURES = [
  'Unlimited commute tracking',
  'Automatic start and stop when you leave and arrive',
  'Home-screen widget: start and stop in one tap',
  'Home and Office labels from your addresses',
  'Last 2 weeks of history, with edit and delete',
  'Weekly totals and trend',
  'Leave-time, forgot-to-track and weekly reminders',
];

/** What Pro adds on top of everything in Free. */
export const PRO_FEATURES = [
  'Reports for any date range, including trips older than 2 weeks',
  'Totals, averages, and to work vs to home',
  'Export as PDF or CSV to share or file a claim',
  'Monthly commute recap',
  'Slow-day heads-up before your slower weekdays',
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
