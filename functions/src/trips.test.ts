import { describe, expect, it } from 'vitest';
import { checkUpload, tripProblem } from './trips';

const NOW = Date.parse('2026-10-07T12:00:00Z');
const INSTALL = '0b8f7a52-6a0e-4d3e-9a51-2c1f6f0b7c11';

const trip = (patch: Record<string, unknown> = {}) => ({
  tripId: '7d5e2a8c-1f3b-4c9d-8e6a-2b4c6d8e0f1a',
  date: '2026-10-06',
  startSlot: 525,
  weekday: 2,
  durationSeconds: 2400,
  distanceKm: 12.3,
  direction: 'work',
  auto: false,
  edited: false,
  fromCell: 'tdr1v',
  toCell: 'tdr1y',
  ...patch,
});

describe('tripProblem', () => {
  it('accepts a normal commute, with or without areas', () => {
    expect(tripProblem(trip(), NOW)).toBeNull();
    expect(tripProblem(trip({ fromCell: null, toCell: null, direction: 'other' }), NOW)).toBeNull();
  });

  it.each([
    ['a date in the future', { date: '2026-10-09', weekday: 5 }, 'date range'],
    ['a date too old', { date: '2026-06-01', weekday: 1 }, 'date range'],
    ['a weekday that does not match the date', { weekday: 3 }, 'weekday'],
    ['a start time not on a 15-minute slot', { startSlot: 527 }, 'startSlot'],
    ['an absurd duration', { durationSeconds: 7 * 3600 }, 'durationSeconds'],
    ['more precision than shared', { distanceKm: 12.34 }, 'distanceKm'],
    ['an impossible speed', { distanceKm: 100, durationSeconds: 600 }, 'speed'],
    ['an exact position instead of an area', { fromCell: '12.9716,77.5946' }, 'cell'],
    ['a finer area than 5 characters', { toCell: 'tdr1vxx' }, 'cell'],
    ['an unknown direction', { direction: 'gym' }, 'direction'],
  ])('refuses %s', (_label, patch, problem) => {
    expect(tripProblem(trip(patch), NOW)).toBe(problem);
  });
});

describe('checkUpload', () => {
  it('stores good trips and refuses only the bad ones', () => {
    const checked = checkUpload({ installId: INSTALL, appVersion: '1.1.1', trips: [trip(), trip({ tripId: 'bad', weekday: 0 })], deleted: ['old-trip'] }, NOW);
    expect(checked?.trips).toHaveLength(1);
    expect(checked?.refused).toEqual(['bad: weekday']);
    expect(checked?.deleted).toEqual(['old-trip']);
  });

  it('refuses a malformed envelope outright', () => {
    expect(checkUpload({ installId: 'someone@example.com', appVersion: '1', trips: [], deleted: [] }, NOW)).toBeNull();
    expect(checkUpload({ installId: INSTALL, appVersion: '1', trips: Array(101).fill(trip()), deleted: [] }, NOW)).toBeNull();
    expect(checkUpload('nope', NOW)).toBeNull();
  });
});
