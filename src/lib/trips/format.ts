const pad = (n: number) => n.toString().padStart(2, '0');

/** 1716 -> "00:28:36" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** 3900 -> "1h 05m". Seconds are dropped, not rounded. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`;
}

/** 2460 -> "41 min", 3900 -> "1 h 5 min", 7200 -> "2 h". Reads as words, for reports and sentences. */
export function formatDurationWords(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** 12400 -> "12.4 km" */
export function formatDistanceKm(meters: number): string {
  return `${(Math.max(0, meters) / 1000).toFixed(1)} km`;
}

/** Local 24-hour time, e.g. "08:05". */
export function formatTimeOfDay(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local 24-hour range, e.g. "08:05 - 09:10". */
export function formatTimeRange(startedAt: number, endedAt: number): string {
  return `${formatTimeOfDay(startedAt)} - ${formatTimeOfDay(endedAt)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "16 Sep (Tue)", or "16 Sep 2025 (Tue)" with the year. */
export function formatDayLabel(timestamp: number, withYear = false): string {
  const d = new Date(timestamp);
  const year = withYear ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year} (${WEEKDAYS[d.getDay()]})`;
}

/** "Today", "Yesterday", or "Mon, 28 Sep" (with the year if it isn't this year). */
export function formatRelativeDay(timestamp: number, now: number): string {
  const day = new Date(timestamp);
  const today = new Date(now);
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((midnight(today) - midnight(day)) / 86_400_000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const year = day.getFullYear() === today.getFullYear() ? '' : ` ${day.getFullYear()}`;
  return `${WEEKDAYS[day.getDay()]}, ${day.getDate()} ${MONTHS[day.getMonth()]}${year}`;
}
