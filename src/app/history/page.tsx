'use client';

import styles from '../page.module.css';

export default function HistoryPage() {
  const historyData = [
    {
      date: '16 Sep 2025 (Tue)',
      sessions: [
        { id: 1, type: 'work', time: '08:05 - 09:10', duration: '1h 05m', dist: '18.4 km' },
        { id: 2, type: 'home', time: '18:15 - 19:20', duration: '1h 05m', dist: '19.2 km' },
      ]
    },
    {
      date: '15 Sep 2025 (Mon)',
      sessions: [
        { id: 3, type: 'work', time: '08:10 - 09:05', duration: '0h 55m', dist: '16.8 km' },
        { id: 4, type: 'home', time: '18:20 - 19:25', duration: '1h 05m', dist: '17.4 km' },
      ]
    },
    {
      date: '14 Sep 2025 (Sun)',
      sessions: [
        { id: 5, type: 'work', time: '09:00 - 10:15', duration: '1h 15m', dist: '21.0 km' },
        { id: 6, type: 'home', time: '17:45 - 19:05', duration: '1h 20m', dist: '22.1 km' },
      ]
    },
    {
      date: '13 Sep 2025 (Sat)',
      sessions: [
        { id: 7, type: 'work', time: '08:00 - 09:10', duration: '1h 10m', dist: '19.5 km' },
        { id: 8, type: 'home', time: '18:10 - 19:50', duration: '1h 40m', dist: '26.4 km' },
      ]
    },
  ];

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">History</h1>
      </header>

      <div className={styles.homeContainer}>
        {historyData.map((day, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              {day.date}
            </h3>
            
            <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {day.sessions.map((session, j) => (
                <div key={session.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '16px', 
                  borderBottom: j === 0 ? '1px solid var(--border-color)' : 'none' 
                }}>
                  <div style={{ 
                    width: '40px', height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-blue-light)', 
                    color: 'var(--primary-blue)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    marginRight: '16px'
                  }}>
                    {session.type === 'home' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>{session.time}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {session.duration} <span style={{ color: '#D1D1D6', margin: '0 4px' }}>|</span> {session.dist}
                    </div>
                  </div>
                  
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
