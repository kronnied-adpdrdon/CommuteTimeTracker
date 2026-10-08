'use client';

import AutoTrackingCard from '@/components/AutoTrackingCard';
import PageHeader from '@/components/PageHeader';

export default function AutomaticPage() {
  return (
    <>
      <PageHeader title="Automatic start and stop" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AutoTrackingCard />
      </div>
    </>
  );
}
