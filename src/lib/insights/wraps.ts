import { Trip } from '../trips/types';
import { DistanceComparison, MOVIE_SECONDS, compareDistance, compareTime } from './equivalents';
import { dayKey } from '../trips/stats';
import { IconName } from './icons';
import { Totals, average, between, commutes, counted, minuteOfDay, officeDays, quickest, totals } from './stats';

/**
 * Wraps: a monthly recap on the 1st, a yearly one from 1 December (it keeps counting to 31 December), and a
 * "first month with MYCE" one 30 days after the first trip. Everything is worked out from the trips on the phone
 * each time, so nothing extra is stored except which Wraps have been opened.
 */

export type WrapKind = 'month' | 'year' | 'first';

/** A month needs this many trips for a Wrap, so it never looks empty... */
export const MIN_MONTH_TRIPS = 8;
/** ...and a year this many, spread over at least this many months (one busy month isn't a year). */
export const MIN_YEAR_TRIPS = 40;
export const MIN_YEAR_MONTHS = 3;
/** The first-month Wrap covers this many days from the first trip. */
export const FIRST_MONTH_DAYS = 30;
/** A Wrap counts as new (Home card, the widget line) for this many days after it comes out. */
export const NEW_DAYS = 7;
/** The yearly Wrap comes out on 1 December, when everyone's posting theirs. */
export const YEAR_WRAP_MONTH = 11;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 0 -> "January". */
export const monthName = (month: number) => MONTHS[month];

export interface WrapPeriod {
  /** "month-2026-10", "year-2026" or "first". */
  id: string;
  kind: WrapKind;
  /** "October 2026", "2026", "Your first month". */
  title: string;
  /** Trips that started in [from, to) are in it. */
  from: number;
  to: number;
  /** When it comes out. */
  availableAt: number;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function monthPeriod(year: number, month: number): WrapPeriod {
  const from = new Date(year, month, 1).getTime();
  const to = new Date(year, month + 1, 1).getTime();
  return { id: `month-${year}-${pad(month + 1)}`, kind: 'month', title: `${MONTHS[month]} ${year}`, from, to, availableAt: to };
}

export function yearPeriod(year: number): WrapPeriod {
  return {
    id: `year-${year}`,
    kind: 'year',
    title: String(year),
    from: new Date(year, 0, 1).getTime(),
    to: new Date(year + 1, 0, 1).getTime(),
    availableAt: new Date(year, YEAR_WRAP_MONTH, 1).getTime(),
  };
}

/** From local midnight on the day of the first trip, for 30 days. Null with no trips. */
export function firstMonthPeriod(trips: Trip[]): WrapPeriod | null {
  if (trips.length === 0) return null;
  const first = new Date(Math.min(...trips.map((t) => t.startedAt)));
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
  const to = new Date(first.getFullYear(), first.getMonth(), first.getDate() + FIRST_MONTH_DAYS).getTime();
  return { id: 'first', kind: 'first', title: 'Your first month', from, to, availableAt: to };
}

/** The period a Wrap id names, or null for an id that isn't one. Works for any period, out yet or not (previews). */
export function periodFor(id: string, trips: Trip[]): WrapPeriod | null {
  if (id === 'first') return firstMonthPeriod(trips);
  const month = /^month-(\d{4})-(\d{2})$/.exec(id);
  if (month && +month[2] >= 1 && +month[2] <= 12) return monthPeriod(+month[1], +month[2] - 1);
  const year = /^year-(\d{4})$/.exec(id);
  if (year) return yearPeriod(+year[1]);
  return null;
}

/** Whether a Wrap has enough trips to show. */
export function hasEnoughTrips(period: WrapPeriod, trips: Trip[]): boolean {
  const list = between(trips, period.from, period.to);
  if (period.kind !== 'year') return list.length >= MIN_MONTH_TRIPS;
  return list.length >= MIN_YEAR_TRIPS && new Set(list.map((t) => new Date(t.startedAt).getMonth())).size >= MIN_YEAR_MONTHS;
}

/** Every Wrap that is out and has enough trips, newest first. */
export function availableWraps(trips: Trip[], now: number): WrapPeriod[] {
  if (trips.length === 0) return [];
  const first = new Date(Math.min(...trips.map((t) => t.startedAt)));
  const today = new Date(now);
  const wraps: WrapPeriod[] = [];

  for (let m = new Date(first.getFullYear(), first.getMonth(), 1); ; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const period = monthPeriod(m.getFullYear(), m.getMonth());
    if (period.availableAt > now) break;
    wraps.push(period);
  }
  for (let y = first.getFullYear(); y <= today.getFullYear(); y++) wraps.push(yearPeriod(y));
  const firstMonth = firstMonthPeriod(trips);
  if (firstMonth) wraps.push(firstMonth);

  return wraps
    .filter((w) => w.availableAt <= now && hasEnoughTrips(w, trips))
    // The November and yearly Wraps both come out on 1 December: the yearly one goes first.
    .sort((a, b) => b.availableAt - a.availableAt || Number(b.kind === 'year') - Number(a.kind === 'year'));
}

/** The Wrap to point people to: out in the last 7 days and not opened yet. A yearly Wrap goes first. */
export function readyWrap(trips: Trip[], now: number, seen: readonly string[]): WrapPeriod | null {
  return availableWraps(trips, now).find((w) => now - w.availableAt < NEW_DAYS * DAY_MS && !seen.includes(w.id)) ?? null;
}

export type PersonalityId = 'early-bird' | 'steady' | 'friday-flyer' | 'night-owl' | 'long-hauler' | 'regular';

export interface Personality {
  id: PersonalityId;
  name: string;
  icon: IconName;
  /** What earned it, with the numbers. */
  line: string;
  /** The same idea without numbers, for a share card with numbers hidden. */
  tagline: string;
}

/** Leaving for work before this (minutes after midnight) is an early start. */
export const EARLY_START = 8 * 60 + 30;
/** Heading home at or after this is a late finish. */
export const LATE_FINISH = 19 * 60 + 30;
/** A trip within this of the usual one that way is "on time". */
export const STEADY_SECONDS = 5 * 60;

const share = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

/**
 * One personality for the period, picked by the first rule that fits. Every one is a compliment: the point is
 * something people are happy to post.
 */
export function personalityFor(trips: Trip[]): Personality {
  const list = counted(commutes(trips));
  const work = list.filter((t) => t.direction === 'work');
  const home = list.filter((t) => t.direction === 'home');

  const early = work.filter((t) => minuteOfDay(t.startedAt) < EARLY_START).length;
  if (work.length >= 5 && share(early, work.length) >= 0.7) {
    return {
      id: 'early-bird',
      name: 'Early Bird',
      icon: 'sunrise',
      line: `Out the door before 8:30 on ${early} of ${work.length} mornings.`,
      tagline: 'Up and out before the traffic.',
    };
  }

  const usual = (way: Trip[]) => average(way) ?? 0;
  const steady = [work, home].reduce((n, way) => n + way.filter((t) => Math.abs(t.durationSeconds - usual(way)) <= STEADY_SECONDS).length, 0);
  const labelled = work.length + home.length;
  if (labelled >= 8 && share(steady, labelled) >= 0.8) {
    return {
      id: 'steady',
      name: 'Steady',
      icon: 'target',
      line: `${steady} of ${labelled} trips landed within 5 minutes of your usual.`,
      tagline: 'Same time, every time.',
    };
  }

  const friday = list.filter((t) => new Date(t.startedAt).getDay() === 5);
  const others = list.filter((t) => new Date(t.startedAt).getDay() !== 5);
  const fridayAvg = average(friday);
  const othersAvg = average(others);
  if (friday.length >= 2 && others.length >= 6 && fridayAvg !== null && othersAvg !== null && fridayAvg <= othersAvg * 0.9) {
    const minutes = Math.round((othersAvg - fridayAvg) / 60);
    return {
      id: 'friday-flyer',
      name: 'Friday Flyer',
      icon: 'bolt',
      line: `Fridays were your quickest: ${minutes} min faster than other days.`,
      tagline: 'Saves the best for Friday.',
    };
  }

  const late = home.filter((t) => minuteOfDay(t.startedAt) >= LATE_FINISH).length;
  if (home.length >= 5 && share(late, home.length) >= 0.7) {
    return {
      id: 'night-owl',
      name: 'Night Owl',
      icon: 'moon',
      line: `Headed home after 7:30 pm on ${late} of ${home.length} evenings.`,
      tagline: 'Last one out, most evenings.',
    };
  }

  const avg = average(list);
  if (avg !== null && avg >= 45 * 60) {
    return {
      id: 'long-hauler',
      name: 'Long Hauler',
      icon: 'road',
      line: `Your average trip was ${Math.round(avg / 60)} min. You go the distance.`,
      tagline: 'Goes the distance, every day.',
    };
  }

  const days = officeDays(trips);
  return {
    id: 'regular',
    name: 'The Regular',
    icon: 'star',
    line: days === 1 ? 'You showed up on 1 office day.' : `You showed up on ${days} office days.`,
    tagline: 'Shows up. Every week.',
  };
}

export interface MonthHighlight {
  /** "October" */
  name: string;
  avgSeconds: number;
  officeDays: number;
}

export interface CalendarDay {
  /** Local midnight. */
  dayStart: number;
  office: boolean;
}

export interface MonthBar {
  name: string;
  trips: number;
  officeDays: number;
  /** Null for a month with too few trips to say. */
  avgSeconds: number | null;
}

export interface WrapSummary extends Totals {
  period: WrapPeriod;
  /** The yearly Wrap before 31 December: covers 1 January to today. */
  soFar: boolean;
  avgSeconds: number | null;
  fastest: Trip | null;
  personality: Personality;
  distance: DistanceComparison | null;
  time: string | null;
  /** Whole films that fit in the time on the road. */
  movies: number;
  /** Monthly and first-month: every day of the period, and whether it was an office day. */
  calendar?: CalendarDay[];
  /** Yearly only: January to the last month so far. */
  months?: MonthBar[];
  /** Yearly only: the month with the quickest average trip, and the one with the most office days. */
  quickestMonth?: MonthHighlight;
  busiestMonth?: MonthHighlight;
}

export function summarizeWrap(period: WrapPeriod, trips: Trip[], now: number): WrapSummary {
  const inPeriod = between(trips, period.from, period.to);
  const sums = totals(inPeriod);
  const summary: WrapSummary = {
    ...sums,
    period,
    soFar: period.kind === 'year' && now < period.to,
    avgSeconds: average(counted(commutes(inPeriod))),
    fastest: quickest(commutes(inPeriod)),
    personality: personalityFor(inPeriod),
    distance: compareDistance(sums.totalMeters),
    time: compareTime(sums.totalSeconds),
    movies: Math.floor(sums.totalSeconds / MOVIE_SECONDS),
  };
  if (period.kind === 'year') {
    const year = new Date(period.from).getFullYear();
    const lastMonth = now < period.to ? new Date(now).getMonth() : 11;
    const months = MONTHS.slice(0, lastMonth + 1).map((name, m) => {
      const list = between(inPeriod, new Date(year, m, 1).getTime(), new Date(year, m + 1, 1).getTime());
      const enough = list.length >= MIN_MONTH_TRIPS;
      return { name, trips: list.length, officeDays: officeDays(list), avgSeconds: enough ? average(counted(commutes(list))) : null };
    });
    summary.months = months;
    const rated = months.filter((m) => m.avgSeconds !== null);
    if (rated.length >= 2) {
      const pick = (m: MonthBar) => ({ name: m.name, avgSeconds: m.avgSeconds!, officeDays: m.officeDays });
      summary.quickestMonth = pick(rated.reduce((a, b) => (b.avgSeconds! < a.avgSeconds! ? b : a)));
      summary.busiestMonth = pick(rated.reduce((a, b) => (b.officeDays > a.officeDays ? b : a)));
    }
  } else {
    const office = new Set(inPeriod.filter((t) => t.direction !== 'unknown').map((t) => dayKey(t.startedAt)));
    const first = new Date(period.from);
    summary.calendar = [];
    for (let d = first; d.getTime() < period.to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      summary.calendar.push({ dayStart: d.getTime(), office: office.has(dayKey(d.getTime())) });
    }
  }
  return summary;
}

/** What the Wrap is called on screen and on share cards: "October 2026 Wrap", "2026 Wrap", "My first month with MYCE". */
export function wrapName(period: WrapPeriod): string {
  return period.kind === 'first' ? 'My first month with MYCE' : `${period.title} Wrap`;
}

/** The "it's out" line on Home, Insights and the widget (WidgetWrap.java says the same). */
export function readyTitle(period: WrapPeriod): string {
  if (period.kind === 'first') return 'Your first month with MYCE';
  if (period.kind === 'year') return `Your ${period.title} Wrap is here`;
  return `Your ${MONTHS[new Date(period.from).getMonth()]} Wrap is ready`;
}

/** The icon for a Wrap in lists and on the ready card. */
export const WRAP_ICON: Record<WrapKind, IconName> = { month: 'calendar', year: 'trophy', first: 'flag' };
