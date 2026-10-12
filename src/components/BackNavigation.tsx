'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { backAction } from '@/lib/navigation';
import { setup, wizardCanGoBack } from '@/lib/setup';

/**
 * Android's Back button, for the whole app. While the setup is showing it goes back one setup screen; on the first
 * one it closes a single item, or sends the app to the background (the setup resumes there next time).
 * Otherwise it follows `backAction`.
 */
export default function BackNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useRef(pathname);
  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('backButton', ({ canGoBack }) => {
        const wizard = setup.getState().wizard;
        if (wizard) {
          if (wizardCanGoBack(wizard)) void setup.back();
          else if (wizard.single) setup.close();
          else void App.minimizeApp();
          return;
        }
        const action = backAction(current.current, canGoBack);
        if (action.kind === 'minimize') void App.minimizeApp();
        else if (action.kind === 'history') router.back();
        else router.replace(action.path);
      });
      if (cancelled) void listener.remove();
      else remove = () => void listener.remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
