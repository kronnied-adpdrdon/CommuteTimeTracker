'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [isActive, setIsActive] = useState(false);
  const [isOffDay, setIsOffDay] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [remarks, setRemarks] = useState('');
  
  // Real-time tracking
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = () => {
    if (!isActive) {
      setStartTime(new Date());
      setEndTime(null);
      setIsActive(true);
    } else {
      setEndTime(new Date());
      setIsActive(false);
      // In a real app, we would save to Firebase here
    }
  };

  // Calculations
  const calculateStats = () => {
    let totalMs = 0;
    
    if (startTime) {
      if (isActive) {
        totalMs = now.getTime() - startTime.getTime();
      } else if (endTime) {
        totalMs = endTime.getTime() - startTime.getTime();
      }
    }

    const totalHours = totalMs / (1000 * 60 * 60);
    
    let otHours = 0;
    if (isOffDay) {
      otHours = totalHours; // Entire duration is OT on an off-day
    } else {
      otHours = Math.max(0, totalHours - 8); // OT is anything over 8 hours
    }

    return {
      workingHours: totalHours.toFixed(2),
      overtimeHours: otHours.toFixed(2)
    };
  };

  const stats = calculateStats();

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.dashboard}>
      <header className="header">
        <h1 className="title">TrackOT</h1>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          👤
        </div>
      </header>

      <div className={styles.dateDisplay}>
        <h2>{now.toLocaleDateString('en-US', { weekday: 'long' })}</h2>
        <p>{now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <button 
        className={`start-btn ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
      >
        <span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.8, marginBottom: '4px' }}>
          {isActive ? 'CURRENTLY WORKING' : 'READY TO WORK'}
        </span>
        {isActive ? 'STOP' : 'START'}
        {isActive && (
          <span style={{ fontSize: '1rem', marginTop: '8px', opacity: 0.9 }}>
            {formatTime(startTime)} - Now
          </span>
        )}
      </button>

      <div className={styles.timeStats}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Start Time</div>
          <div className={styles.statValue}>{formatTime(startTime)}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>End Time</div>
          <div className={styles.statValue}>{isActive ? '--:--' : formatTime(endTime)}</div>
        </div>
        
        <div className={`${styles.statBox} ${styles.highlightedStat}`}>
          <div className={styles.statLabel}>Total Working Hours</div>
          <div className={styles.statValue}>{stats.workingHours}h</div>
        </div>
        
        <div className={`${styles.statBox} ${styles.highlightedStat}`}>
          <div className={styles.statLabel} style={{ color: 'var(--accent-color)' }}>Total Overtime</div>
          <div className={styles.statValue}>{stats.overtimeHours}h</div>
        </div>
      </div>

      <button className={styles.editTimeBtn}>
        Forgot to start/stop? Edit manually
      </button>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div>
            <div style={{ fontWeight: 500 }}>Off-Day Shift</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>All hours count as Overtime</div>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isOffDay} 
              onChange={(e) => setIsOffDay(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>
        
        <textarea 
          className={styles.remarksArea} 
          placeholder="Add OT remarks or notes for today..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className={styles.recentHistory}>
        <div className={styles.historyHeader}>
          <h3>Last 5 Days</h3>
          <Link href="/history" className={styles.historyLink}>View Full History →</Link>
        </div>
        
        <div className={styles.historyList}>
          {/* Mock recent history */}
          {[1, 2, 3].map((i) => {
            const pastDate = new Date();
            pastDate.setDate(now.getDate() - i);
            return (
              <div key={i} className={styles.historyItem}>
                <div className={styles.historyDate}>
                  {pastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className={styles.historyDetails}>
                  <span>9.0h total</span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>1.0h OT</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
