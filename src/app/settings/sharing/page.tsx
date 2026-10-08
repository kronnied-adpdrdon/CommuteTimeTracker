'use client';

import PageHeader from '@/components/PageHeader';
import SharingCard from '@/components/SharingCard';

export default function SharingPage() {
  return (
    <>
      <PageHeader title="Help improve MYCE" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SharingCard showTitle={false} />
      </div>
    </>
  );
}
