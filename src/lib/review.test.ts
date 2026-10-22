import { describe, expect, it } from 'vitest';
import { shouldAskForReview } from './review';
import { SAMPLE_PREFIX } from './trips/sample';
import { Trip } from './trips/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 22, 9).getTime();
const trip = (id = 'a'): Trip => ({ id, startedAt: NOW - DAY, endedAt: NOW - DAY + 40 * 60_000, durationSeconds: 2400, distanceMeters: 12000, direction: 'work' });

describe('shouldAskForReview', () => {
  it('asks a week after first use once a trip is saved', () => {
    expect(shouldAskForReview({ asked: false, firstUseAt: NOW - 7 * DAY, trips: [trip()], now: NOW })).toBe(true);
  });

  it('waits for a full week', () => {
    expect(shouldAskForReview({ asked: false, firstUseAt: NOW - 6 * DAY, trips: [trip()], now: NOW })).toBe(false);
  });

  it('waits for a real trip; sample trips from Developer tools do not count', () => {
    expect(shouldAskForReview({ asked: false, firstUseAt: NOW - 10 * DAY, trips: [], now: NOW })).toBe(false);
    expect(shouldAskForReview({ asked: false, firstUseAt: NOW - 10 * DAY, trips: [trip(`${SAMPLE_PREFIX}1`)], now: NOW })).toBe(false);
  });

  it('asks only once', () => {
    expect(shouldAskForReview({ asked: true, firstUseAt: NOW - 30 * DAY, trips: [trip()], now: NOW })).toBe(false);
  });

  it('does nothing until first use is known', () => {
    expect(shouldAskForReview({ asked: false, firstUseAt: null, trips: [trip()], now: NOW })).toBe(false);
  });
});
