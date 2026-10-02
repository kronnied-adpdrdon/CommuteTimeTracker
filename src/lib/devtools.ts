'use client';

import { useEffect, useState } from 'react';
import { isNativeApp, lazyPlugin } from './native';

/**
 * Demo builds (`NEXT_PUBLIC_DEV_TOOLS=1 npm run build:android:demo`) show a "Preview as Pro" switch so the
 * Pro screens can be checked without buying. Play Store release builds leave it off.
 */
export const DEV_TOOLS = process.env.NEXT_PUBLIC_DEV_TOOLS === '1';

interface BuildInfoPlugin {
  buildInfo(): Promise<{ debuggable: boolean }>;
}

const plugin = lazyPlugin<BuildInfoPlugin>('Support');

let devBuild: Promise<boolean> | null = null;

/**
 * True for demo builds and for debug builds (the APK Android Studio / `gradlew assembleDebug` installs).
 * Debug is read from Android's own "debuggable" flag, which a release build signed for Play never has,
 * so the switch can't appear for real users.
 */
export function isDevBuild(): Promise<boolean> {
  devBuild ??= (async () => {
    if (DEV_TOOLS) return true;
    try {
      if (!(await isNativeApp())) return false;
      return (await (await plugin()).native.buildInfo()).debuggable === true;
    } catch {
      return false;
    }
  })();
  return devBuild;
}

/** Whether to show developer tools such as the Free / Pro switch. False until the answer arrives. */
export function useDevTools(): boolean {
  const [enabled, setEnabled] = useState(DEV_TOOLS);
  useEffect(() => {
    let cancelled = false;
    void isDevBuild().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}
