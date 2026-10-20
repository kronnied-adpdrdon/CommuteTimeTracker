/**
 * Whether a link is the widget's myce://start, sent only when the widget can't record by itself (no location
 * permission, or location off). It only opens the app: any app can send this link, so it must never start or
 * stop a trip. The user taps Start, which asks for what's missing.
 */
export function isWidgetLink(url: string): boolean {
  return /^myce:\/\/start\b/.test(url);
}
