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

/** Trips shorter than this are left out of averages and the quickest trip: usually Start tapped by mistake. */
export const MIN_COUNTED_SECONDS = 5 * 60;
/** "Your usual trip" is the average over this many full weeks before the current one. */
export const USUAL_WEEKS = 4;
/** ...and needs at least this many trips, so one odd trip doesn't set it. */
export const MIN_USUAL_TRIPS = 3;
/** The quickest trip is picked from this many days, today included. */
export const QUICKEST_DAYS = 30;

export interface WeeklySummary {
  totalSeconds: number;
  totalMeters: number;
  tripCount: number;
  /** Average trip this week, over trips of 5 min or more. Null if there are none. */
  avgSecondsPerTrip: number | null;
  /** Average trip over the 4 full weeks before this one. Null with fewer than 3 trips there. */
  usualSecondsPerTrip: number | null;
  /**
   * This week's average trip minus the usual one, in seconds. Negative = quicker. Averages per trip, not totals,
   * so commuting on more days doesn't read as a slower commute. Null when either average is missing.
   */
  changeSeconds: number | null;
  /** Quickest trip of 5 min or more in the last 30 days, today included. */
  quickest: Trip | null;
}

/** Totals for the Monday-to-Sunday week containing `now`, with the average trip compared against the 4 weeks before. */
export function weeklySummary(trips: Trip[], now: Date): WeeklySummary {
  const weekStart = startOfWeek(now);
  const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const inRange = (from: Date, to: Date) =>
    trips.filter((t) => t.startedAt >= from.getTime() && t.startedAt < to.getTime());
  const counted = (list: Trip[]) => list.filter((t) => t.durationSeconds >= MIN_COUNTED_SECONDS);
  const average = (list: Trip[]) =>
    list.length === 0 ? null : Math.round(list.reduce((sum, t) => sum + t.durationSeconds, 0) / list.length);

  const thisWeek = inRange(weekStart, addDays(weekStart, 7));
  const usualTrips = counted(inRange(addDays(weekStart, -7 * USUAL_WEEKS), weekStart));
  const avgSecondsPerTrip = average(counted(thisWeek));
  const usualSecondsPerTrip = usualTrips.length >= MIN_USUAL_TRIPS ? average(usualTrips) : null;

  const quickest = counted(tripsSince(trips, windowStart(now, QUICKEST_DAYS))).reduce<Trip | null>(
    (best, t) => (best === null || t.durationSeconds < best.durationSeconds ? t : best),
    null,
  );

  return {
    totalSeconds: thisWeek.reduce((sum, t) => sum + t.durationSeconds, 0),
    totalMeters: thisWeek.reduce((sum, t) => sum + t.distanceMeters, 0),
    tripCount: thisWeek.length,
    avgSecondsPerTrip,
    usualSecondsPerTrip,
    changeSeconds: avgSecondsPerTrip === null || usualSecondsPerTrip === null ? null : avgSecondsPerTrip - usualSecondsPerTrip,
    quickest,
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
