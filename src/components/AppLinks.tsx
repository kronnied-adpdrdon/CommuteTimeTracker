'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { commute } from '@/lib/commute';
import { widgetAction } from '@/lib/commute/widget';

/** Handles the widget's Start / Stop / open taps, which arrive as myce:// links. */
export default function AppLinks() {
  const router = useRouter();

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    const handle = async (url: string) => {
      const action = widgetAction(url);
      if (!action) return;
      await commute.init();
      router.push('/');
      if (action === 'start') await commute.start();
      if (action === 'stop') await commute.stop();
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
