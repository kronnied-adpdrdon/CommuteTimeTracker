import { describe, expect, it } from 'vitest';
import { tagDirection } from './direction';
import { SAMPLE_PREFIX, SAMPLE_PLACES, generateSampleTrips, isSampleTrip } from './sample';

// A Friday afternoon.
const NOW = new Date(2026, 9, 2, 15, 0).getTime();
const startOfToday = new Date(2026, 9, 2).getTime();
const DAY = 24 * 60 * 60 * 1000;

const { trips } = generateSampleTrips(NOW);
const average = (list: { durationSeconds: number }[]) => list.reduce((sum, t) => sum + t.durationSeconds, 0) / list.length;

describe('sample trips', () => {
  it('are the same every time', () => {
    expect(generateSampleTrips(NOW).trips).toEqual(trips);
  });

  it('have unique ids with the sample prefix and none for today', () => {
    expect(new Set(trips.map((t) => t.id)).size).toBe(trips.length);
    expect(trips.every((t) => t.id.startsWith(SAMPLE_PREFIX) && isSampleTrip(t))).toBe(true);
    expect(trips.every((t) => t.startedAt < startOfToday)).toBe(true);
  });

  it('cover this week, last week, older than 2 weeks, and all of last month', () => {
    // NOW is a Friday: this week started on Monday (4 days back), last week the Monday before.
    expect(trips.some((t) => t.startedAt >= startOfToday - 4 * DAY)).toBe(true);
    expect(trips.some((t) => t.startedAt >= startOfToday - 11 * DAY && t.startedAt < startOfToday - 4 * DAY)).toBe(true);
    expect(trips.some((t) => t.startedAt < startOfToday - 15 * DAY)).toBe(true);
    const september = trips.filter((t) => new Date(t.startedAt).getMonth() === 8);
    expect(september.length).toBeGreaterThan(25);
    expect(trips.length).toBeGreaterThan(80);
  });

  it('make Tuesdays clearly slower than other days', () => {
    const tuesdays = trips.filter((t) => new Date(t.startedAt).getDay() === 2);
    expect(average(tuesdays)).toBeGreaterThan(average(trips) * 1.15);
  });

  it('are labelled to work, to home, and unknown for the errands', () => {
    expect(trips.some((t) => t.direction === 'work')).toBe(true);
    expect(trips.some((t) => t.direction === 'home')).toBe(true);
    const unknown = trips.filter((t) => t.direction === 'unknown');
    expect(unknown.length).toBeGreaterThanOrEqual(2);
    expect(unknown.every((t) => new Date(t.startedAt).getDay() === 6)).toBe(true);
  });

  it('stay consistent with the sample addresses when re-labelled', () => {
    for (const trip of trips) expect(tagDirection(trip.start, trip.end, SAMPLE_PLACES)).toBe(trip.direction);
  });

  it('are sensible trips', () => {
    for (const trip of trips) {
      expect(trip.durationSeconds).toBeGreaterThan(20 * 60);
      expect(trip.durationSeconds).toBeLessThan(90 * 60);
      expect(trip.endedAt - trip.startedAt).toBe(trip.durationSeconds * 1000);
    }
  });
});
