import styles from '@/app/page.module.css';

export default function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`${styles.switch} ${checked ? styles.switchOn : ''}`} onClick={() => onChange(!checked)}>
      <span className={styles.switchKnob} />
    </button>
  );
}
