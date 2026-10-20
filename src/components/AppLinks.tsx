'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isWidgetLink } from '@/lib/commute/widget';

/** Handles the widget's Start tap when it can't record by itself: arrives as myce://start and opens the home screen. */
export default function AppLinks() {
  const router = useRouter();

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    const handle = async (url: string) => {
      if (isWidgetLink(url)) router.push('/');
    };

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appUrlOpen', ({ url }) => void handle(url));
      if (cancelled) {
        void listener.remove();
        return;
      }
      removeListener = () => void listener.remove();
      // Cold start from the widget: the link arrives as the launch URL instead.
      const launch = await App.getLaunchUrl();
      if (launch?.url) await handle(launch.url);
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
