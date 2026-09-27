'use client';

export default function ProfilePage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Profile</h1>
      </header>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Personal Details */}
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center', color: 'var(--primary-blue)', marginRight: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500 }}>Name</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not set <span style={{ marginLeft: '4px' }}>›</span></div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center', color: 'var(--primary-blue)', marginRight: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>
            <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500 }}>Mobile Number</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not set <span style={{ marginLeft: '4px' }}>›</span></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center', color: 'var(--primary-blue)', marginRight: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500 }}>Email ID</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not set <span style={{ marginLeft: '4px' }}>›</span></div>
          </div>
        </div>

        {/* Locations */}
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center', color: 'var(--primary-blue)', marginRight: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '2px' }}>Office Location</div>
              <div style={{ color: 'var(--primary-blue)', fontSize: '0.85rem' }}>Not set</div>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center', color: 'var(--primary-blue)', marginRight: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '2px' }}>Home Location</div>
              <div style={{ color: 'var(--primary-blue)', fontSize: '0.85rem' }}>Not set</div>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
