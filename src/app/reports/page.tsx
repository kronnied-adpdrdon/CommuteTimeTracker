'use client';

export default function ReportsPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Reports</h1>
      </header>

      <div style={{ padding: '0 16px' }}>
        <div style={{ 
          background: 'var(--surface-color)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-color)', 
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ color: 'var(--primary-blue)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Generate Commute Report</h2>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', paddingLeft: '36px' }}>
            Select a date range to create your report.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '16px', color: 'var(--text-secondary)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <input className="input-field" type="text" placeholder="From Date" style={{ paddingLeft: '38px' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '16px', color: 'var(--text-secondary)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <input className="input-field" type="text" placeholder="To Date" style={{ paddingLeft: '38px' }} />
            </div>
          </div>

          <button className="btn-primary" style={{ marginBottom: '20px' }}>
            Generate Report
          </button>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--bg-color)', padding: '16px', borderRadius: '12px' }}>
            <svg style={{ flexShrink: 0, color: 'var(--primary-blue)', marginTop: '2px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Each report will be deducted from your available report credits.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
