import { Trip } from './types';

/** Local-time calendar key, e.g. "2026-09-28". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday 00:00 (local time) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

export interface DaySummary {
  dayKey: string;
  /** Local midnight of that day. */
  dayStart: number;
  trips: Trip[];
  totalSeconds: number;
  totalMeters: number;
}

/** Groups trips by local calendar day. Newest day first; trips within a day oldest first. */
export function groupByDay(trips: Trip[]): DaySummary[] {
  const byDay = new Map<string, Trip[]>();
  for (const trip of trips) {
    const key = dayKey(trip.startedAt);
    byDay.set(key, [...(byDay.get(key) ?? []), trip]);
  }

  return [...byDay.entries()]
    .map(([key, dayTrips]) => {
      const sorted = [...dayTrips].sort((a, b) => a.startedAt - b.startedAt);
      const first = new Date(sorted[0].startedAt);
      return {
        dayKey: key,
        dayStart: new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime(),
        trips: sorted,
        totalSeconds: sorted.reduce((sum, t) => sum + t.durationSeconds, 0),
        totalMeters: sorted.reduce((sum, t) => sum + t.distanceMeters, 0),
      };
    })
    .sort((a, b) => b.dayStart - a.dayStart);
}

export interface WeeklySummary {
  totalSeconds: number;
  totalMeters: number;
  daysWithTrips: number;
  /** Average over days that had at least one trip, not over all seven days. */
  avgSecondsPerDay: number;
  /** Whole-number % change in total commute time vs the previous week. Positive = longer. Null if last week had no trips. */
  changePercent: number | null;
}

/** Totals for the Monday-to-Sunday week containing `now`, compared with the week before. */
export function weeklySummary(trips: Trip[], now: Date): WeeklySummary {
  const weekStart = startOfWeek(now);
  const nextWeekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const prevWeekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7);

  const inRange = (from: Date, to: Date) =>
    trips.filter((t) => t.startedAt >= from.getTime() && t.startedAt < to.getTime());

  const thisWeek = inRange(weekStart, nextWeekStart);
  const lastWeek = inRange(prevWeekStart, weekStart);

  const totalSeconds = thisWeek.reduce((sum, t) => sum + t.durationSeconds, 0);
  const totalMeters = thisWeek.reduce((sum, t) => sum + t.distanceMeters, 0);
  const prevSeconds = lastWeek.reduce((sum, t) => sum + t.durationSeconds, 0);
  const daysWithTrips = new Set(thisWeek.map((t) => dayKey(t.startedAt))).size;

  return {
    totalSeconds,
    totalMeters,
    daysWithTrips,
    avgSecondsPerDay: daysWithTrips === 0 ? 0 : Math.round(totalSeconds / daysWithTrips),
    changePercent: prevSeconds === 0 ? null : Math.round(((totalSeconds - prevSeconds) / prevSeconds) * 100),
  };
}

/** The most recent `count` days that have trips, newest first. */
export function recentDays(trips: Trip[], count: number): DaySummary[] {
  return groupByDay(trips).slice(0, count);
}

/** Local midnight `days - 1` days before `now`, so the window covers `days` calendar days including today. */
export function windowStart(now: Date, days: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
}

/** Trips that started on or after `from`. */
export function tripsSince(trips: Trip[], from: Date): Trip[] {
  return trips.filter((t) => t.startedAt >= from.getTime());
}

/** The newest `count` trips, newest first. */
export function recentTrips(trips: Trip[], count: number): Trip[] {
  return [...trips].sort((a, b) => b.startedAt - a.startedAt).slice(0, count);
}
