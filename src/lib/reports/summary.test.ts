import { describe, expect, it } from 'vitest';
import { Trip } from '../trips/types';
import { customPeriod, formatPeriod, presetPeriod, summarize, toCsv, toDayInput, tripsInPeriod } from './summary';

const now = new Date(2026, 9, 1, 12); // Thu 1 Oct 2026
let id = 0;
const trip = (y: number, m: number, d: number, h: number, minutes: number, meters: number, direction: Trip['direction'] = 'unknown'): Trip => {
  const startedAt = new Date(y, m, d, h).getTime();
  return { id: String(id++), startedAt, endedAt: startedAt + minutes * 60_000, durationSeconds: minutes * 60, distanceMeters: meters, direction };
};

describe('periods', () => {
  it('this week runs Monday to Sunday', () => {
    const p = presetPeriod('this-week', now);
    expect(toDayInput(p.from)).toBe('2026-09-28');
    expect(toDayInput(p.to)).toBe('2026-10-05');
    expect(formatPeriod(p)).toBe('28 Sep – 4 Oct 2026');
  });
  it('last week, this month and last month', () => {
    expect(formatPeriod(presetPeriod('last-week', now))).toBe('21 – 27 Sep 2026');
    expect(formatPeriod(presetPeriod('this-month', now))).toBe('1 – 31 Oct 2026');
    expect(formatPeriod(presetPeriod('last-month', now))).toBe('1 – 30 Sep 2026');
  });
  it('last month from January is December of the previous year', () => {
    expect(formatPeriod(presetPeriod('last-month', new Date(2026, 0, 15)))).toBe('1 – 31 Dec 2025');
  });
  it('custom range includes both days; rejects a backwards range', () => {
    const p = customPeriod('2026-09-30', '2026-10-02')!;
    expect(formatPeriod(p)).toBe('30 Sep – 2 Oct 2026');
    expect(customPeriod('2026-10-02', '2026-09-30')).toBeNull();
    expect(customPeriod('', '2026-09-30')).toBeNull();
  });
  it('a single day and a range across years', () => {
    expect(formatPeriod(customPeriod('2026-10-01', '2026-10-01')!)).toBe('1 Oct 2026');
    expect(formatPeriod(customPeriod('2025-12-30', '2026-01-05')!)).toBe('30 Dec 2025 – 5 Jan 2026');
  });
});

describe('summarize', () => {
  const trips = [
    trip(2026, 8, 28, 8, 40, 12000, 'work'),
    trip(2026, 8, 28, 18, 50, 12500, 'home'),
    trip(2026, 8, 29, 8, 30, 11000, 'work'),
    trip(2026, 8, 20, 8, 99, 99999, 'work'), // previous week
  ];
  const period = presetPeriod('this-week', now);
  const inWeek = tripsInPeriod(trips, period);

  it('keeps trips in the period, oldest first', () => {
    expect(inWeek.map((t) => t.durationSeconds / 60)).toEqual([40, 50, 30]);
  });
  it('totals, averages and the work/home split', () => {
    const s = summarize(inWeek);
    expect(s.tripCount).toBe(3);
    expect(s.totalSeconds).toBe(120 * 60);
    expect(s.totalMeters).toBe(35500);
    expect(s.avgSecondsPerTrip).toBe(40 * 60);
    expect(s.daysWithTrips).toBe(2);
    expect(s.byDirection.work).toEqual({ count: 2, totalSeconds: 70 * 60 });
    expect(s.byDirection.home).toEqual({ count: 1, totalSeconds: 50 * 60 });
  });
  it('an empty period is all zeros', () => {
    expect(summarize([])).toMatchObject({ tripCount: 0, totalSeconds: 0, avgSecondsPerTrip: 0 });
  });
});

describe('toCsv', () => {
  it('one row per trip, oldest first, with a header and CRLF line endings', () => {
    const csv = toCsv([trip(2026, 8, 29, 8, 30, 11000, 'work'), trip(2026, 8, 28, 18, 50, 12460, 'home')]);
    expect(csv).toBe(
      'Date,Start,End,Duration (min),Distance (km),Direction\r\n' +
        '2026-09-28,18:00,18:50,50,12.5,To home\r\n' +
        '2026-09-29,08:00,08:30,30,11.0,To work\r\n',
    );
  });
});
