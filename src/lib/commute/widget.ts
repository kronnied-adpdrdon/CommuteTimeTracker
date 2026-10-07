/** What a myce:// link asks for. The widget only sends one when location permission is missing. */
export function widgetAction(url: string): 'start' | 'stop' | 'open' | null {
  const match = /^myce:\/\/(start|stop|open)\b/.exec(url);
  return match ? (match[1] as 'start' | 'stop' | 'open') : null;
}
