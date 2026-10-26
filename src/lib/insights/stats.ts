import { MIN_COUNTED_SECONDS, dayKey } from '../trips/stats';
import { Trip } from '../trips/types';

/** Patterns (weekdays, going vs coming back) look at this many recent days. */
export const PATTERN_DAYS = 56;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trips long enough to count in averages and records: a few seconds usually means Start was tapped by mistake. */
export const counted = (trips: Trip[]) => trips.filter((t) => t.durationSeconds >= MIN_COUNTED_SECONDS);

export const average = (trips: Trip[]) =>
  trips.length === 0 ? null : Math.round(trips.reduce((sum, t) => sum + t.durationSeconds, 0) / trips.length);

/**
 * Trips to or from the Office, so weekend errands don't count as your quickest trip or day. Someone who hasn't set
 * Home and Office has no labelled trips, so for them every trip counts.
 */
export function commutes(trips: Trip[]): Trip[] {
  const labelled = trips.filter((t) => t.direction !== 'unknown');
  return labelled.length > 0 ? labelled : trips;
}

/** Trips that started in [from, to). */
export const between = (trips: Trip[], from: number, to: number) => trips.filter((t) => t.startedAt >= from && t.startedAt < to);

/** Days with a trip to or from the Office. A trip MYCE couldn't label doesn't count. */
export function officeDays(trips: Trip[]): number {
  return new Set(trips.filter((t) => t.direction !== 'unknown').map((t) => dayKey(t.startedAt))).size;
}

export interface Totals {
  trips: number;
  totalSeconds: number;
  totalMeters: number;
  officeDays: number;
}

export function totals(trips: Trip[]): Totals {
  return {
    trips: trips.length,
    totalSeconds: trips.reduce((sum, t) => sum + t.durationSeconds, 0),
    totalMeters: trips.reduce((sum, t) => sum + t.distanceMeters, 0),
    officeDays: officeDays(trips),
  };
}

/** Local midnight on the 1st of the month containing `now`. */
export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** The quickest counted trip, or null. */
export function quickest(trips: Trip[]): Trip | null {
  return counted(trips).reduce<Trip | null>((best, t) => (best === null || t.durationSeconds < best.durationSeconds ? t : best), null);
}

/** 1 = Monday … 7 = Sunday, in local time. */
export const weekdayOf = (timestamp: number) => ((new Date(timestamp).getDay() + 6) % 7) + 1;

/** Minutes after local midnight that a trip started. */
export function minuteOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  return d.getHours() * 60 + d.getMinutes();
}

const recent = (trips: Trip[], now: number) => counted(commutes(trips)).filter((t) => t.startedAt >= now - PATTERN_DAYS * DAY_MS && t.startedAt <= now);

export interface WeekdayAverage {
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  avgSeconds: number;
  trips: number;
}

export interface WeekdayPattern {
  days: WeekdayAverage[];
  best: WeekdayAverage;
  worst: WeekdayAverage;
}

/**
 * Average trip by weekday over the last 8 weeks, for days with at least 2 trips. Null with fewer than 3 such days,
 * or when the best and worst are within 2 minutes (nothing worth saying).
 */
export function weekdayPattern(trips: Trip[], now: number): WeekdayPattern | null {
  const byDay = new Map<number, Trip[]>();
  for (const t of recent(trips, now)) {
    const weekday = weekdayOf(t.startedAt);
    byDay.set(weekday, [...(byDay.get(weekday) ?? []), t]);
  }
  const days = [...byDay.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([weekday, list]) => ({ weekday, avgSeconds: average(list)!, trips: list.length }))
    .sort((a, b) => a.weekday - b.weekday);
  if (days.length < 3) return null;
  const best = days.reduce((a, b) => (b.avgSeconds < a.avgSeconds ? b : a));
  const worst = days.reduce((a, b) => (b.avgSeconds > a.avgSeconds ? b : a));
  if (worst.avgSeconds - best.avgSeconds < 2 * 60) return null;
  return { days, best, worst };
}

export interface GoingVsComingBack {
  workSeconds: number;
  homeSeconds: number;
}

/** Average trip to work and home over the last 8 weeks. Null without 3 trips each way. */
export function goingVsComingBack(trips: Trip[], now: number): GoingVsComingBack | null {
  const list = recent(trips, now);
  const work = list.filter((t) => t.direction === 'work');
  const home = list.filter((t) => t.direction === 'home');
  if (work.length < 3 || home.length < 3) return null;
  return { workSeconds: average(work)!, homeSeconds: average(home)! };
}

export interface Records {
  quickestToWork: Trip | null;
  quickestHome: Trip | null;
  longest: Trip | null;
}

/** All-time bests, from counted trips only. */
export function records(trips: Trip[]): Records {
  const list = counted(commutes(trips));
  return {
    quickestToWork: quickest(list.filter((t) => t.direction === 'work')),
    quickestHome: quickest(list.filter((t) => t.direction === 'home')),
    longest: list.reduce<Trip | null>((best, t) => (best === null || t.distanceMeters > best.distanceMeters ? t : best), null),
  };
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 1 -> "Monday" … 7 -> "Sunday". */
export const weekdayName = (weekday: number) => WEEKDAY_NAMES[weekday - 1];
