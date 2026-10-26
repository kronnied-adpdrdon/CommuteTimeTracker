'use client';

import { Suspense } from 'react';
import WrapViewer from '@/components/WrapViewer';

// The Wrap's id comes from `?id=`, which a static export only knows in the browser, so it reads it under Suspense.
export default function WrapPage() {
  return (
    <Suspense fallback={null}>
      <WrapViewer />
    </Suspense>
  );
}
