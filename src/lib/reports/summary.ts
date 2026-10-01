import { startOfWeek } from '../trips/stats';
import { Trip, TripDirection } from '../trips/types';

export type PeriodPreset = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

export interface ReportPeriod {
  /** Local midnight, inclusive. */
  from: Date;
  /** Local midnight, exclusive. */
  to: Date;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, now: Date): ReportPeriod {
  const week = startOfWeek(now);
  switch (preset) {
    case 'this-week':
      return { from: week, to: addDays(week, 7) };
    case 'last-week':
      return { from: addDays(week, -7), to: week };
    case 'this-month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    case 'last-month':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
}

/** From two "YYYY-MM-DD" values (both days included). Null if either is missing or they're the wrong way round. */
export function customPeriod(fromDay: string, toDay: string): ReportPeriod | null {
  const parse = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  };
  const from = parse(fromDay);
  const last = parse(toDay);
  if (!from || !last || last < from) return null;
  return { from, to: addDays(last, 1) };
}

/** "28 Sep – 4 Oct 2026", "1 – 31 Oct 2026", or "30 Dec 2025 – 5 Jan 2026". */
export function formatPeriod({ from, to }: ReportPeriod): string {
  const last = addDays(to, -1);
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (from.getFullYear() !== last.getFullYear()) {
    return `${day(from)} ${from.getFullYear()} – ${day(last)} ${last.getFullYear()}`;
  }
  if (from.getTime() === last.getTime()) return `${day(from)} ${from.getFullYear()}`;
  if (from.getMonth() === last.getMonth()) {
    return `${from.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  return `${day(from)} – ${day(last)} ${last.getFullYear()}`;
}

/** "YYYY-MM-DD" for a date input. */
export function toDayInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Trips that started inside the period, oldest first. */
export function tripsInPeriod(trips: Trip[], { from, to }: ReportPeriod): Trip[] {
  return trips
    .filter((t) => t.startedAt >= from.getTime() && t.startedAt < to.getTime())
    .sort((a, b) => a.startedAt - b.startedAt);
}

export interface DirectionTotals {
  count: number;
  totalSeconds: number;
}

export interface ReportSummary {
  tripCount: number;
  totalSeconds: number;
  totalMeters: number;
  avgSecondsPerTrip: number;
  daysWithTrips: number;
  byDirection: Record<TripDirection, DirectionTotals>;
}

export function summarize(trips: Trip[]): ReportSummary {
  const byDirection: Record<TripDirection, DirectionTotals> = {
    work: { count: 0, totalSeconds: 0 },
    home: { count: 0, totalSeconds: 0 },
    unknown: { count: 0, totalSeconds: 0 },
  };
  const days = new Set<string>();
  let totalSeconds = 0;
  let totalMeters = 0;
  for (const trip of trips) {
    totalSeconds += trip.durationSeconds;
    totalMeters += trip.distanceMeters;
    byDirection[trip.direction].count++;
    byDirection[trip.direction].totalSeconds += trip.durationSeconds;
    days.add(toDayInput(new Date(trip.startedAt)));
  }
  return {
    tripCount: trips.length,
    totalSeconds,
    totalMeters,
    avgSecondsPerTrip: trips.length ? Math.round(totalSeconds / trips.length) : 0,
    daysWithTrips: days.size,
    byDirection,
  };
}

export const DIRECTION_LABELS: Record<TripDirection, string> = { work: 'To work', home: 'To home', unknown: '' };

/** One row per trip, oldest first. CRLF line endings so Excel and Google Sheets open it cleanly. */
export function toCsv(trips: Trip[]): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hhmm = (t: number) => {
    const d = new Date(t);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const rows = [...trips]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((t) =>
      [
        toDayInput(new Date(t.startedAt)),
        hhmm(t.startedAt),
        hhmm(t.endedAt),
        Math.round(t.durationSeconds / 60),
        (t.distanceMeters / 1000).toFixed(1),
        DIRECTION_LABELS[t.direction],
      ].join(','),
    );
  return ['Date,Start,End,Duration (min),Distance (km),Direction', ...rows].join('\r\n') + '\r\n';
}
