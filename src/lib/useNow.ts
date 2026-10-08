'use client';

import { useState } from 'react';

/** The time when the screen opened, read once so drawing stays pure (React's rule). */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
