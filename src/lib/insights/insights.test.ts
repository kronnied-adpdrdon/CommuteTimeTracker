import { describe, expect, it } from 'vitest';
import { Trip, TripDirection } from '../trips/types';
import { compareDistance, compareTime, formatDaysHours, formatHours } from './equivalents';
import { wrapCards } from './cards';
import { parseSeen } from './seen';
import { goingVsComingBack, officeDays, records, weekdayPattern } from './stats';
import { availableWraps, firstMonthPeriod, periodFor, personalityFor, readyWrap, summarizeWrap, wrapName } from './wraps';

let n = 0;
/** A trip starting at local `y-m-d h:min`, `minutes` long. Months are 1-based here, for readability. */
function trip(y: number, m: number, d: number, h: number, min: number, minutes: number, direction: TripDirection = 'work', km = 12): Trip {
  const startedAt = new Date(y, m - 1, d, h, min).getTime();
  return { id: `t${n++}`, startedAt, endedAt: startedAt + minutes * 60_000, durationSeconds: minutes * 60, distanceMeters: km * 1000, direction };
}

/** Weekday trips to work at 09:00 and home at 18:00 for every weekday of a month (1-based). */
function workMonth(y: number, m: number, toWork = 40, toHome = 45): Trip[] {
  const trips: Trip[] = [];
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
    const day = new Date(y, m - 1, d).getDay();
    if (day === 0 || day === 6) continue;
    trips.push(trip(y, m, d, 9, 0, toWork, 'work'), trip(y, m, d, 18, 0, toHome, 'home'));
  }
  return trips;
}

describe('everyday comparisons', () => {
  it('picks the longest route covered, and counts repeats', () => {
    expect(compareDistance(600_000)?.text).toBe('As far as Mumbai → Goa');
    expect(compareDistance(480_000)?.text).toBe('As far as Bengaluru → Chennai');
    expect(compareDistance(2_900_000)?.text).toBe('As far as Delhi → Mumbai, 2 times over');
    expect(compareDistance(50_000)?.text).toBe("13 laps of Mumbai's Marine Drive");
    expect(compareDistance(1_000)).toBeNull();
  });

  it('words time as movies, or podcast episodes when short', () => {
    expect(compareTime(33 * 3600)).toBe("13 movies' worth of time");
    expect(compareTime(2 * 3600)).toBe('2 podcast episodes of time');
    expect(compareTime(10 * 60)).toBeNull();
  });

  it('formats headline hours and days', () => {
    expect(formatHours(33 * 3600 + 1800)).toBe('33 h');
    expect(formatHours(4 * 3600 + 20 * 60)).toBe('4 h 20 min');
    expect(formatHours(45 * 60)).toBe('45 min');
    expect(formatDaysHours((4 * 24 + 6) * 3600)).toBe('4 days 6 hours');
    expect(formatDaysHours(3600)).toBe('1 hour');
  });
});

describe('insights', () => {
  const now = new Date(2026, 9, 31, 22, 0).getTime();

  it('counts office days, leaving out trips it could not label', () => {
    const trips = [trip(2026, 10, 5, 9, 0, 40), trip(2026, 10, 5, 18, 0, 40, 'home'), trip(2026, 10, 6, 9, 0, 40), trip(2026, 10, 10, 11, 0, 20, 'unknown')];
    expect(officeDays(trips)).toBe(2);
  });

  it('finds the best and worst weekday', () => {
    const pattern = weekdayPattern(workMonth(2026, 10).map((t) => (new Date(t.startedAt).getDay() === 1 ? { ...t, durationSeconds: t.durationSeconds + 600 } : t)), now)!;
    expect(pattern.worst.weekday).toBe(1);
    expect(pattern.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5]);
    expect(weekdayPattern(workMonth(2026, 10), now)).toBeNull();
  });

  it('compares going with coming back', () => {
    expect(goingVsComingBack(workMonth(2026, 10, 40, 52), now)).toEqual({ workSeconds: 40 * 60, homeSeconds: 52 * 60 });
  });

  it('leaves weekend errands out of records and patterns, unless nothing is labelled', () => {
    const errand = trip(2026, 10, 10, 11, 0, 12, 'unknown');
    expect(records([...workMonth(2026, 10), errand]).quickestToWork?.durationSeconds).toBe(40 * 60);
    expect(weekdayPattern([...workMonth(2026, 10), errand, { ...errand, id: 'e2', startedAt: errand.startedAt + 7 * 86_400_000 }], now)).toBeNull();
    const s = summarizeWrap(periodFor('month-2026-10', [])!, [...workMonth(2026, 10), errand], now);
    expect(s.fastest?.direction).toBe('work');
    expect(records([trip(2026, 10, 5, 9, 0, 30, 'unknown')]).longest).not.toBeNull();
  });

  it('keeps records from real trips only, not mis-taps', () => {
    const r = records([trip(2026, 10, 5, 9, 0, 2), trip(2026, 10, 6, 9, 0, 31), trip(2026, 10, 7, 9, 0, 35)]);
    expect(r.quickestToWork?.durationSeconds).toBe(31 * 60);
    expect(r.quickestHome).toBeNull();
  });
});

describe('wraps', () => {
  it('names Wraps by id, and rejects ids that are not Wraps', () => {
    expect(periodFor('month-2026-10', [])?.title).toBe('October 2026');
    expect(periodFor('year-2027', [])?.title).toBe('2027');
    expect(periodFor('month-2026-13', [])).toBeNull();
    expect(periodFor('../settings', [])).toBeNull();
    expect(wrapName(periodFor('year-2027', [])!)).toBe('2027 Wrap');
  });

  it('brings out each month on the 1st, only with enough trips', () => {
    const trips = [...workMonth(2026, 9), trip(2026, 10, 2, 9, 0, 40), trip(2026, 10, 3, 9, 0, 40)];
    const ids = availableWraps(trips, new Date(2026, 10, 2).getTime()).map((w) => w.id);
    expect(ids).toContain('month-2026-09');
    expect(ids).not.toContain('month-2026-10');
    expect(availableWraps(trips, new Date(2026, 9, 31).getTime()).map((w) => w.id)).toContain('month-2026-09');
  });

  it('needs trips in 3 months for a yearly Wrap', () => {
    const trips = [...workMonth(2027, 10), ...workMonth(2027, 11)];
    expect(availableWraps(trips, new Date(2027, 11, 5).getTime()).map((w) => w.id)).not.toContain('year-2027');
  });

  it('brings out the yearly Wrap on 1 December, ahead of November', () => {
    const trips = [...workMonth(2027, 9), ...workMonth(2027, 10), ...workMonth(2027, 11)];
    expect(availableWraps(trips, new Date(2027, 10, 30).getTime()).map((w) => w.id)).not.toContain('year-2027');
    const dec1 = availableWraps(trips, new Date(2027, 11, 1, 9).getTime());
    expect(dec1.slice(0, 2).map((w) => w.id)).toEqual(['year-2027', 'month-2027-11']);
    expect(summarizeWrap(dec1[0], trips, new Date(2027, 11, 1).getTime()).soFar).toBe(true);
  });

  it('offers the first-month Wrap 30 days after the first trip', () => {
    const trips = workMonth(2026, 11);
    const first = firstMonthPeriod(trips)!;
    expect(new Date(first.availableAt).getDate()).toBe(new Date(2026, 10, 2 + 30).getDate());
    expect(availableWraps(trips, first.availableAt - 1).map((w) => w.id)).not.toContain('first');
    expect(availableWraps(trips, first.availableAt).map((w) => w.id)).toContain('first');
  });

  it('points to a new Wrap for a week, until it is opened', () => {
    const trips = workMonth(2026, 11);
    const dec2 = new Date(2026, 11, 2).getTime();
    expect(readyWrap(trips, dec2, [])?.id).toBe('first');
    expect(readyWrap(trips, dec2, ['first'])?.id).toBe('month-2026-11');
    expect(readyWrap(trips, dec2, ['first', 'month-2026-11'])).toBeNull();
    expect(readyWrap(trips, new Date(2026, 11, 20).getTime(), [])).toBeNull();
  });

  it('sums the month and finds its fastest trip', () => {
    const trips = workMonth(2026, 10, 40, 45);
    trips[3] = { ...trips[3], durationSeconds: 25 * 60 };
    const s = summarizeWrap(periodFor('month-2026-10', trips)!, trips, Date.now());
    expect(s.trips).toBe(44);
    expect(s.officeDays).toBe(22);
    expect(s.totalMeters).toBe(44 * 12_000);
    expect(s.fastest?.durationSeconds).toBe(25 * 60);
    expect(s.distance).toMatchObject({ text: 'As far as Bengaluru → Chennai', from: 'Bengaluru', to: 'Chennai', times: 1 });
    expect(s.calendar).toHaveLength(31);
    expect(s.calendar!.filter((d) => d.office)).toHaveLength(22);
    expect(s.movies).toBe(Math.floor((22 * 85 * 60) / 9000));
  });

  it('picks the quickest and busiest months in a year', () => {
    const trips = [...workMonth(2027, 3, 50, 50), ...workMonth(2027, 4, 30, 30), ...workMonth(2027, 2, 45, 45)];
    const s = summarizeWrap(periodFor('year-2027', trips)!, trips, new Date(2028, 0, 2).getTime());
    expect(s.soFar).toBe(false);
    expect(s.quickestMonth?.name).toBe('April');
    expect(s.busiestMonth?.name).toBe('March');
    expect(s.months?.map((m) => m.name)).toHaveLength(12);
    expect(s.months?.[0]).toMatchObject({ name: 'January', trips: 0, avgSeconds: null });
  });
});

describe('wrap cards', () => {
  it('puts the cards in order, ends with the summary, and never shows one colour twice in a row', () => {
    const month = workMonth(2026, 10);
    const year = [...workMonth(2027, 3, 50, 50), ...workMonth(2027, 4, 30, 30), ...workMonth(2027, 2, 45, 45)];
    for (const [id, trips, now] of [['month-2026-10', month, Date.now()], ['year-2027', year, new Date(2028, 0, 2).getTime()]] as const) {
      const cards = wrapCards(summarizeWrap(periodFor(id, [...trips])!, [...trips], now));
      expect(cards[0]).toMatchObject({ id: 'intro', theme: 'asphalt' });
      expect(cards.at(-1)).toMatchObject({ id: 'share', theme: 'asphalt' });
      expect(cards.at(-2)).toMatchObject({ id: 'personality', theme: 'amber' });
      cards.slice(1).forEach((c, i) => {
        expect(c.theme).not.toBe(cards[i].theme);
        expect(c.glow).not.toBe(cards[i].glow);
      });
    }
  });
});

describe('personality', () => {
  it('calls early starters Early Birds', () => {
    const trips = workMonth(2026, 10).map((t) => (t.direction === 'work' ? { ...t, startedAt: t.startedAt - 75 * 60_000 } : t));
    expect(personalityFor(trips).id).toBe('early-bird');
  });

  it('calls same-every-day commuters Steady', () => {
    expect(personalityFor(workMonth(2026, 10)).id).toBe('steady');
  });

  it('spots quick Fridays', () => {
    const trips = workMonth(2026, 10).map((t, i) => {
      const day = new Date(t.startedAt).getDay();
      return { ...t, durationSeconds: day === 5 ? 25 * 60 : (35 + (i % 4) * 6) * 60 };
    });
    const p = personalityFor(trips);
    expect(p.id).toBe('friday-flyer');
    expect(p.line).toMatch(/Fridays were your quickest/);
  });

  it('always has something kind to say', () => {
    const p = personalityFor([trip(2026, 10, 5, 9, 0, 20), trip(2026, 10, 9, 11, 0, 60, 'unknown')]);
    expect(p.id).toBe('regular');
    expect(p.line).toBe('You showed up on 1 office day.');
    expect(p.tagline).not.toMatch(/\d/);
  });
});

describe('opened Wraps', () => {
  it('reads the saved list, ignoring anything broken', () => {
    expect(parseSeen('["first","month-2026-10"]')).toEqual(['first', 'month-2026-10']);
    expect(parseSeen('{oops')).toEqual([]);
    expect(parseSeen('[1,"first"]')).toEqual(['first']);
    expect(parseSeen(null)).toEqual([]);
  });
});
