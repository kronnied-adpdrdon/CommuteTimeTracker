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
