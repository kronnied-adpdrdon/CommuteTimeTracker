import { describe, expect, it } from 'vitest';
import { Trip } from '../trips/types';
import { MAX_BATCH, SHARE_WINDOW_DAYS, applySent, fingerprint, geohash, planSync, toSharedTrip } from './records';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 7, 20, 0).getTime();

const trip = (id: string, startedAt: number, extra: Partial<Trip> = {}): Trip => ({
  id,
  startedAt,
  endedAt: startedAt + 40 * 60 * 1000,
  durationSeconds: 2400,
  distanceMeters: 12_345,
  direction: 'work',
  start: { lat: 12.9716, lng: 77.5946 },
  end: { lat: 12.9352, lng: 77.6245 },
  ...extra,
});

describe('geohash', () => {
  it('matches the reference encoding', () => {
    expect(geohash({ lat: 57.64911, lng: 10.40744 }, 11)).toBe('u4pruydqqvj');
    expect(geohash({ lat: 12.9716, lng: 77.5946 })).toBe('tdr1v');
  });

  it('gives nearby points (a few hundred metres apart) the same 5-character cell', () => {
    expect(geohash({ lat: 12.9716, lng: 77.5946 })).toBe(geohash({ lat: 12.9735, lng: 77.5969 }));
  });
});

describe('toSharedTrip', () => {
  it('keeps only coarse details: day, 15-minute slot, rounded distance, ~5 km cells', () => {
    const start = new Date(2026, 9, 6, 8, 52).getTime();
    expect(toSharedTrip(trip('a', start))).toEqual({
      tripId: 'a',
      date: '2026-10-06',
      startSlot: 8 * 60 + 45,
      weekday: 2,
      durationSeconds: 2400,
      distanceKm: 12.3,
      direction: 'work',
      auto: false,
      edited: false,
      fromCell: 'tdr1v',
      toCell: geohash({ lat: 12.9352, lng: 77.6245 }),
    });
  });

  it('marks automatic and edited trips, calls unknown directions "other" and copes without start or end', () => {
    const original = { startedAt: 0, endedAt: 0, durationSeconds: 0, distanceMeters: 0, direction: 'work' as const };
    const record = toSharedTrip(trip('b', NOW - DAY, { direction: 'unknown', auto: true, original, start: undefined, end: undefined }));
    expect(record).toMatchObject({ direction: 'other', auto: true, edited: true, fromCell: null, toCell: null });
  });

  it('never includes exact coordinates', () => {
    expect(JSON.stringify(toSharedTrip(trip('c', NOW - DAY)))).not.toMatch(/12\.97|77\.59/);
  });
});

describe('planSync', () => {
  const since = NOW - 10 * DAY;

  it('sends trips from after sharing was turned on, inside the window, and never sample trips', () => {
    const trips = [
      trip('before-sharing', since - 1),
      trip('new', since + DAY),
      trip('sample-20261006-1', since + DAY),
      trip('future', NOW + DAY),
    ];
    expect(planSync(trips, {}, since, NOW).upserts.map((r) => r.tripId)).toEqual(['new']);
  });

  it('leaves out trips older than the window even when sharing has been on longer', () => {
    const old = trip('old', NOW - (SHARE_WINDOW_DAYS + 1) * DAY);
    expect(planSync([old], {}, 0, NOW).upserts).toEqual([]);
  });

  it('resends a trip only when what would be shared changed', () => {
    const t = trip('a', since + DAY);
    const sent = { a: fingerprint(toSharedTrip(t)) };
    expect(planSync([t], sent, since, NOW).upserts).toEqual([]);
    expect(planSync([{ ...t, distanceMeters: 20_000 }], sent, since, NOW).upserts.map((r) => r.distanceKm)).toEqual([20]);
  });

  it('deletes sent trips that are gone from the phone, but not ones that only aged out', () => {
    const aged = trip('aged', NOW - (SHARE_WINDOW_DAYS + 5) * DAY);
    const sent = { gone: 'x', aged: fingerprint(toSharedTrip(aged)) };
    expect(planSync([aged], sent, 0, NOW)).toEqual({ upserts: [], deletions: ['gone'] });
  });

  it('caps a batch and leaves the rest for the next one', () => {
    const trips = Array.from({ length: MAX_BATCH + 7 }, (_, i) => trip(`t${i}`, since + DAY + i));
    const first = planSync(trips, {}, since, NOW);
    expect(first.upserts).toHaveLength(MAX_BATCH);
    const second = planSync(trips, applySent({}, first), since, NOW);
    expect(second.upserts).toHaveLength(7);
    expect(planSync(trips, applySent(applySent({}, first), second), since, NOW).upserts).toEqual([]);
  });
});

describe('applySent', () => {
  it('records upserts and forgets deletions', () => {
    const record = toSharedTrip(trip('a', NOW - DAY));
    expect(applySent({ gone: 'x', keep: 'y' }, { upserts: [record], deletions: ['gone'] })).toEqual({ keep: 'y', a: fingerprint(record) });
  });
});
