import styles from '@/app/page.module.css';

/**
 * A route drawn like a transit-map line: a green start dot, dashed lane markings and a destination ring.
 * While a trip runs the dashes flow and an amber dot travels along it. It is decoration, not progress:
 * the app doesn't know where the trip will end.
 */
export default function RouteLine({ active }: { active: boolean }) {
  return (
    <svg className={`${styles.routeLine} ${active ? styles.routeLineActive : ''}`} viewBox="0 0 300 28" aria-hidden role="presentation">
      <line className={styles.routeDashes} x1="22" y1="14" x2="278" y2="14" />
      <circle cx="14" cy="14" r="7" fill="#43da8b" />
      <circle cx="286" cy="14" r="7" fill="none" stroke="#f4f2ec" strokeWidth="3" />
      <circle className={styles.routeVehicle} cx="22" cy="14" r="5" fill="#ffb400" />
    </svg>
  );
}
