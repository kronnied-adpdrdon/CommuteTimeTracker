import { describe, expect, it } from 'vitest';
import { dayKey, groupByDay, recentDays, recentTrips, startOfWeek, tripsSince, weeklySummary, windowStart } from './stats';
import { Trip } from './types';

let nextId = 0;
const trip = (y: number, m: number, d: number, hour: number, minutes: number, meters = 10000): Trip => {
  const startedAt = new Date(y, m, d, hour).getTime();
  return {
    id: String(nextId++),
    startedAt,
    endedAt: startedAt + minutes * 60_000,
    durationSeconds: minutes * 60,
    distanceMeters: meters,
    direction: 'unknown',
  };
};

// 28 Sep 2026 is a Monday.
const MON = [2026, 8, 28] as const;

describe('startOfWeek', () => {
  it('returns Monday midnight for every day of the week, Monday to Sunday', () => {
    for (let offset = 0; offset < 7; offset++) {
      const start = startOfWeek(new Date(2026, 8, 28 + offset, 15, 30));
      expect(dayKey(start.getTime())).toBe('2026-09-28');
      expect(start.getHours()).toBe(0);
    }
  });
  it('a Sunday belongs to the week that started the previous Monday', () => {
    const start = startOfWeek(new Date(2026, 9, 4)); // Sun 4 Oct
    expect(dayKey(start.getTime())).toBe('2026-09-28');
  });
});

describe('groupByDay', () => {
  it('groups by local day, newest first, trips in time order', () => {
    const trips = [trip(...MON, 18, 65), trip(2026, 8, 27, 8, 50), trip(...MON, 8, 55)];
    const days = groupByDay(trips);
    expect(days.map((d) => d.dayKey)).toEqual(['2026-09-28', '2026-09-27']);
    expect(days[0].trips.map((t) => t.durationSeconds)).toEqual([55 * 60, 65 * 60]);
    expect(days[0].totalSeconds).toBe(120 * 60);
  });
  it('returns nothing for no trips', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('weeklySummary', () => {
  const now = new Date(2026, 8, 30, 12); // Wednesday

  // The 4 weeks before this one: Mon 31 Aug to Sun 27 Sep.
  const usual = (minutes: number) => [trip(2026, 8, 7, 8, minutes), trip(2026, 8, 14, 8, minutes), trip(2026, 8, 21, 8, minutes)];

  it('totals the current week and averages per trip', () => {
    const trips = [trip(...MON, 8, 60), trip(...MON, 18, 60), trip(2026, 8, 29, 8, 90)];
    const s = weeklySummary(trips, now);
    expect(s.totalSeconds).toBe(210 * 60);
    expect(s.tripCount).toBe(3);
    expect(s.avgSecondsPerTrip).toBe(70 * 60);
    expect(s.totalMeters).toBe(30000);
  });

  it('compares the average trip with the 4 weeks before, so more trips this week is not "slower"', () => {
    const trips = [...usual(50), trip(...MON, 8, 45), trip(...MON, 18, 45), trip(2026, 8, 29, 8, 45), trip(2026, 8, 29, 18, 45)];
    const s = weeklySummary(trips, now);
    expect(s.usualSecondsPerTrip).toBe(50 * 60);
    expect(s.changeSeconds).toBe(-5 * 60);
  });

  it('leaves trips older than 4 weeks out of the usual trip', () => {
    const trips = [trip(2026, 7, 24, 8, 20), ...usual(50), trip(...MON, 8, 60)];
    expect(weeklySummary(trips, now).usualSecondsPerTrip).toBe(50 * 60);
  });

  it('has no comparison with fewer than 3 trips in the 4 weeks before', () => {
    const s = weeklySummary([trip(2026, 8, 14, 8, 50), trip(2026, 8, 21, 8, 50), trip(...MON, 8, 60)], now);
    expect(s.usualSecondsPerTrip).toBeNull();
    expect(s.changeSeconds).toBeNull();
  });

  it('has no average or comparison before the first trip of the week, instead of showing a big drop', () => {
    const s = weeklySummary(usual(50), now);
    expect(s.tripCount).toBe(0);
    expect(s.avgSecondsPerTrip).toBeNull();
    expect(s.changeSeconds).toBeNull();
  });

  it('leaves trips under 5 minutes out of the average and the quickest, but not the total', () => {
    const s = weeklySummary([trip(...MON, 8, 2), trip(...MON, 9, 40)], now);
    expect(s.totalSeconds).toBe(42 * 60);
    expect(s.avgSecondsPerTrip).toBe(40 * 60);
    expect(s.quickest?.durationSeconds).toBe(40 * 60);
  });

  it('picks the quickest trip from the last 30 days, today included', () => {
    // 30 days back from Wed 30 Sep starts on Tue 1 Sep.
    const inWindow = trip(2026, 8, 1, 8, 25);
    const s = weeklySummary([trip(2026, 7, 31, 8, 20), inWindow, trip(...MON, 8, 40)], now);
    expect(s.quickest).toBe(inWindow);
  });

  it('ignores trips outside this week in the totals', () => {
    const s = weeklySummary([trip(2026, 7, 1, 8, 60), trip(2026, 9, 5, 8, 60)], now);
    expect(s.totalSeconds).toBe(0);
    expect(s.tripCount).toBe(0);
  });

  it('counts a Sunday-evening trip in the week that ends that day', () => {
    const s = weeklySummary([trip(2026, 9, 4, 22, 30)], new Date(2026, 9, 4, 23, 30));
    expect(s.totalSeconds).toBe(30 * 60);
  });
});

describe('recentDays', () => {
  it('returns the latest N days that have trips', () => {
    const trips = [trip(2026, 8, 20, 8, 30), trip(2026, 8, 24, 8, 30), trip(...MON, 8, 30)];
    expect(recentDays(trips, 2).map((d) => d.dayKey)).toEqual(['2026-09-28', '2026-09-24']);
  });
});

describe('two-week history window', () => {
  const now = new Date(2026, 9, 1, 20, 0); // Thu 1 Oct, evening
  it('starts at midnight 13 days ago, so it covers 14 calendar days including today', () => {
    expect(dayKey(windowStart(now, 14).getTime())).toBe('2026-09-18');
    expect(windowStart(now, 14).getHours()).toBe(0);
  });
  it('keeps trips inside the window and drops older ones', () => {
    const trips = [trip(2026, 8, 17, 23, 30), trip(2026, 8, 18, 0, 30), trip(2026, 9, 1, 8, 30)];
    expect(tripsSince(trips, windowStart(now, 14)).map((t) => dayKey(t.startedAt))).toEqual([
      '2026-09-18',
      '2026-10-01',
    ]);
  });
});

describe('recentTrips', () => {
  it('returns the newest trips first, whatever order they are stored in', () => {
    const trips = [trip(2026, 8, 20, 8, 30), trip(2026, 8, 28, 18, 30), trip(2026, 8, 28, 8, 30), trip(2026, 8, 24, 8, 30)];
    expect(recentTrips(trips, 3).map((t) => t.startedAt)).toEqual([
      new Date(2026, 8, 28, 18).getTime(),
      new Date(2026, 8, 28, 8).getTime(),
      new Date(2026, 8, 24, 8).getTime(),
    ]);
  });
});
