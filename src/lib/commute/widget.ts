/** What a commutetracker:// link asks for. The widget only sends one when location permission is missing. */
export function widgetAction(url: string): 'start' | 'stop' | 'open' | null {
  const match = /^commutetracker:\/\/(start|stop|open)\b/.exec(url);
  return match ? (match[1] as 'start' | 'stop' | 'open') : null;
}
