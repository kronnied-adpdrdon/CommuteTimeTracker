/** The bottom-bar tabs. Switching between them replaces the screen instead of stacking up history. */
export const TABS = ['/', '/history', '/insights', '/reports', '/settings'] as const;

/** Settings and the screens opened from it, which keep the Settings tab lit. */
export const isSettingsScreen = (pathname: string) => /^\/(settings|notifications|feedback|report-bug|privacy|terms|licenses)(\/|$)/.test(pathname);

export type BackAction = { kind: 'history' } | { kind: 'replace'; path: string } | { kind: 'minimize' };

/**
 * What Android's Back button does, like other Android apps: a screen opened from another goes back to it, a tab
 * goes to Home, and Home sends the app to the background (a trip being recorded carries on).
 */
export function backAction(pathname: string, canGoBack: boolean): BackAction {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return { kind: 'minimize' };
  if ((TABS as readonly string[]).includes(path)) return { kind: 'replace', path: '/' };
  if (canGoBack) return { kind: 'history' };
  // Opened with nothing behind it: go up to the screen it belongs to.
  return { kind: 'replace', path: isSettingsScreen(path) ? '/settings' : path === '/wrap' ? '/insights' : '/' };
}
