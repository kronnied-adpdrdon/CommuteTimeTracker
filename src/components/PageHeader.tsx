'use client';

import { useRouter } from 'next/navigation';

/** Title bar with a back arrow, for screens opened from Settings or Reports. */
export default function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="page-header" style={{ justifyContent: 'flex-start', gap: '8px' }}>
      <button
        aria-label="Back"
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px', display: 'flex' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
