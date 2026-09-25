'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function History() {
  const router = useRouter();

  // Mock data for the last 14 days
  const mockHistory = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (i + 1));
    const isOffDay = date.getDay() === 0 || date.getDay() === 6; // Weekend = offday mock
    const workHours = isOffDay ? 4 : 9.5;
    const ot = isOffDay ? 4 : 1.5;
    
    return {
      id: i,
      date,
      startTime: '09:00 AM',
      endTime: isOffDay ? '01:00 PM' : '06:30 PM',
      workHours,
      overtime: ot,
      isOffDay
    };
  });

  return (
    <div className="animate-fade-in">
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ←
        </button>
        <h1 className="title">History</h1>
      </header>

      <div style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Showing records for the last 14 days.
      </div>

      <div className={styles.historyList}>
        {mockHistory.map((record) => (
          <div key={record.id} className={styles.recordCard}>
            <div className={styles.recordHeader}>
              <div className={styles.dateInfo}>
                {record.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className={`${styles.badge} ${record.isOffDay ? styles.offDay : ''}`}>
                {record.isOffDay ? 'Off-Day' : 'Standard'}
              </div>
            </div>
            
            <div className={styles.recordDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Shift</span>
                <span className={styles.detailValue}>{record.startTime} - {record.endTime}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Working Hours</span>
                <span className={styles.detailValue}>{record.workHours}h</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Overtime</span>
                <span className={`${styles.detailValue} ${record.overtime > 0 ? styles.otValue : ''}`}>
                  {record.overtime > 0 ? `+${record.overtime}h` : '0h'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.lockedSection}>
        <div className={styles.lockedIcon}>🔒</div>
        <h3>Older History Locked</h3>
        <p>Unlock complete access to your historical data and generate comprehensive reports for payroll or HR.</p>
        <Link href="/pricing" style={{ textDecoration: 'none' }}>
          <button className="btn-primary">View Pro Plans</button>
        </Link>
      </div>
    </div>
  );
}
