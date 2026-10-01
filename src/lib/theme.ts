'use client';

import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

/** localStorage, not Preferences: the layout reads it synchronously before first paint to avoid a light flash. */
export const THEME_KEY = 'theme';

/** Runs in <head> before the page paints. Keep it tiny and dependency-free. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export function readTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Matches the status-bar icons to the theme: light icons on the dark theme, dark icons on the light one. */
async function syncSystemBars(preference: ThemePreference) {
  try {
    const { SystemBars, SystemBarsStyle } = await import('@capacitor/core');
    const style =
      preference === 'dark' ? SystemBarsStyle.Dark : preference === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Default;
    await SystemBars.setStyle({ style });
  } catch {
    // Not available in a desktop browser.
  }
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
  try {
    if (preference === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {
    // Storage unavailable: the choice lasts until the app closes.
  }
  void syncSystemBars(preference);
}

export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    // localStorage only exists in the browser, so read it after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreference(readTheme());
  }, []);
  return [
    preference,
    (next) => {
      setPreference(next);
      applyTheme(next);
    },
  ];
}

/** Mounted once in the layout: applies the saved theme to the system bars on launch. */
export function ThemeSync() {
  useEffect(() => {
    void syncSystemBars(readTheme());
  }, []);
  return null;
}
