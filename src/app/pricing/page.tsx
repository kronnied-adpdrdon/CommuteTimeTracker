'use client';

export default function PricingPage() {
  return (
    <>
      <header className="page-header" style={{ marginBottom: '8px' }}>
        <h1 className="page-title">Get more from<br/>Track Commute</h1>
      </header>
      
      <p style={{ padding: '0 20px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
        Unlock reports and keep your<br/>commute data forever.
      </p>

      <div style={{ display: 'flex', overflowX: 'auto', padding: '0 16px 20px', gap: '16px', scrollSnapType: 'x mandatory' }}>
        {/* Tier 1 */}
        <div style={{ 
          minWidth: '160px',
          background: 'var(--surface-color)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-color)', 
          padding: '24px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          scrollSnapAlign: 'start'
        }}>
          <div style={{ color: 'var(--primary-blue)', marginBottom: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>1 Report</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>₹9</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center' }}>One-time purchase</div>
          <button className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: 'auto' }}>Buy Now</button>
        </div>

        {/* Tier 2 */}
        <div style={{ 
          minWidth: '160px',
          background: 'var(--surface-color)', 
          borderRadius: '20px', 
          border: '2px solid var(--primary-blue)', 
          padding: '24px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative',
          scrollSnapAlign: 'start'
        }}>
          <div style={{ position: 'absolute', top: '-12px', background: 'var(--primary-blue)', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px' }}>
            Popular
          </div>
          <div style={{ color: 'var(--primary-blue)', marginBottom: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>5 Reports</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>₹29</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center' }}>One-time purchase</div>
          <button className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: 'auto' }}>Buy Now</button>
        </div>

        {/* Tier 3 */}
        <div style={{ 
          minWidth: '220px',
          background: 'var(--surface-color)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-color)', 
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          scrollSnapAlign: 'start'
        }}>
          <div style={{ color: '#F5A623', marginBottom: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Lifetime Pro</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>₹99</div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--success-color)"><circle cx="12" cy="12" r="12"/><path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="white"/></svg>
              Unlimited reports
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--success-color)"><circle cx="12" cy="12" r="12"/><path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="white"/></svg>
              Keep your data forever
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--success-color)"><circle cx="12" cy="12" r="12"/><path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 8z" fill="white"/></svg>
              One-time payment
            </li>
          </ul>

          <button className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: 'auto' }}>Buy Now</button>
        </div>
      </div>
    </>
  );
}
