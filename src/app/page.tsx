'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [isActive, setIsActive] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(1716); // 00:28:36
  
  // Format hh:mm:ss
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Track Commute</h1>
        <div className="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
      </header>

      <div className={styles.homeContainer}>
        {/* Tracking Card */}
        <div className={styles.trackingCard}>
          {isActive ? (
            <div className={styles.trackingPill}>Tracking...</div>
          ) : (
            <div className={styles.trackingPill} style={{background: 'var(--border-color)', color: 'var(--text-secondary)'}}>Stopped</div>
          )}
          
          <div className={styles.timeDisplay}>{formatTime(elapsedSeconds)}</div>
          <div className={styles.timeLabel}>Commute Time</div>
          
          <div className={styles.distanceDisplay}>12.4 km</div>
          <div className={styles.timeLabel}>Distance Travelled</div>
          
          {isActive ? (
            <button className={styles.stopButton} onClick={() => setIsActive(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
              Stop
            </button>
          ) : (
            <button className={styles.startButton} onClick={() => setIsActive(true)}>
              Start Tracking
            </button>
          )}
        </div>

        {/* This Week Summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            This Week
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>9h 20m</div>
              <div className={styles.summaryLabel}>Total Commute Time</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>1h 52m</div>
              <div className={styles.summaryLabel}>Avg. per Day</div>
            </div>
          </div>
          <div className={styles.trendRow}>
            <span className={styles.trendPositive}>↓ 12%</span> <span style={{color: 'var(--text-secondary)'}}>vs Previous Week</span>
          </div>
        </div>

        {/* Last 5 Days List */}
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitle}>Last 5 Days</div>
            <Link href="/history" className={styles.seeAllBtn}>See All</Link>
          </div>
          
          <div className={styles.historyRow}>
            <div className={styles.historyDate}>16 Sep (Tue)</div>
            <div className={styles.historyBar}><div className={styles.historyBarFill} style={{width: '90%'}}></div></div>
            <div className={styles.historyTime}>1h 45m</div>
            <div className={styles.historyDist}>28.4 km</div>
          </div>
          <div className={styles.historyRow}>
            <div className={styles.historyDate}>15 Sep (Mon)</div>
            <div className={styles.historyBar}><div className={styles.historyBarFill} style={{width: '75%'}}></div></div>
            <div className={styles.historyTime}>1h 30m</div>
            <div className={styles.historyDist}>24.2 km</div>
          </div>
          <div className={styles.historyRow}>
            <div className={styles.historyDate}>14 Sep (Sun)</div>
            <div className={styles.historyBar}><div className={styles.historyBarFill} style={{width: '60%'}}></div></div>
            <div className={styles.historyTime}>1h 20m</div>
            <div className={styles.historyDist}>22.1 km</div>
          </div>
          <div className={styles.historyRow}>
            <div className={styles.historyDate}>13 Sep (Sat)</div>
            <div className={styles.historyBar}><div className={styles.historyBarFill} style={{width: '100%'}}></div></div>
            <div className={styles.historyTime}>1h 50m</div>
            <div className={styles.historyDist}>30.0 km</div>
          </div>
          <div className={styles.historyRow}>
            <div className={styles.historyDate}>12 Sep (Fri)</div>
            <div className={styles.historyBar}><div className={styles.historyBarFill} style={{width: '55%'}}></div></div>
            <div className={styles.historyTime}>1h 15m</div>
            <div className={styles.historyDist}>20.3 km</div>
          </div>
        </div>
      </div>
    </>
  );
}
