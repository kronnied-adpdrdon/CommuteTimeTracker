import styles from '@/app/page.module.css';

export default function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      style={disabled ? { opacity: 0.4 } : undefined}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchKnob} />
    </button>
  );
}
