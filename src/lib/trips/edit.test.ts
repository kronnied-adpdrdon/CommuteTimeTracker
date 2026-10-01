import { describe, expect, it } from 'vitest';
import { endTimeFromClock, retagTrips, withEndTime, withPlace } from './edit';
import { Trip } from './types';

const at = (h: number, m: number, day = 30) => new Date(2026, 8, day, h, m).getTime();

const trip: Trip = {
  id: 't',
  startedAt: at(8, 0),
  endedAt: at(11, 30),
  durationSeconds: 3.5 * 3600,
  distanceMeters: 12000,
  direction: 'unknown',
  start: { lat: 12.9, lng: 77.6 },
  end: { lat: 12.97, lng: 77.75 },
};

describe('endTimeFromClock', () => {
  it('puts the time on the day the trip started', () => {
    expect(endTimeFromClock(at(8, 0), '09:10')).toBe(at(9, 10));
  });
  it('a time before the start means the trip crossed midnight', () => {
    expect(endTimeFromClock(at(23, 30), '00:20')).toBe(at(0, 20, 31));
  });
  it('rejects nonsense', () => {
    expect(endTimeFromClock(at(8, 0), 'abc')).toBeNull();
    expect(endTimeFromClock(at(8, 0), '25:00')).toBeNull();
    expect(endTimeFromClock(at(8, 0), '09:75')).toBeNull();
  });
});

describe('withEndTime', () => {
  it('fixes a forgotten Stop: shorter duration, same distance', () => {
    const fixed = withEndTime(trip, at(9, 5))!;
    expect(fixed.durationSeconds).toBe(65 * 60);
    expect(fixed.distanceMeters).toBe(12000);
  });
  it('refuses an end at or before the start', () => {
    expect(withEndTime(trip, at(8, 0))).toBeNull();
    expect(withEndTime(trip, at(7, 0))).toBeNull();
  });
  it('refuses a trip over 24 hours', () => {
    expect(withEndTime(trip, at(9, 0, 31))).toBeNull();
  });
});

describe('retagTrips', () => {
  it('tags old trips once Home and Office are known', () => {
    const [tagged] = retagTrips([trip], { home: trip.start, office: trip.end });
    expect(tagged.direction).toBe('work');
  });
  it('a trip with no recorded start or end stays unknown', () => {
    const [tagged] = retagTrips([{ ...trip, start: undefined, end: undefined }], { home: trip.start });
    expect(tagged.direction).toBe('unknown');
  });
});

describe('withPlace', () => {
  it('sets and clears a place, keeping only coordinates', () => {
    const set = withPlace({}, 'home', { lat: 1, lng: 2, accuracy: 5 } as never);
    expect(set).toEqual({ home: { lat: 1, lng: 2 } });
    expect(withPlace(set, 'home', null)).toEqual({});
  });
});
