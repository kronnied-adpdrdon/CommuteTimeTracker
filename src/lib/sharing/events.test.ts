import { describe, expect, it } from 'vitest';
import { Trip } from '../trips/types';
import { tripEvents } from './events';

const trip = (id: string, extra: Partial<Trip> = {}): Trip => ({
  id,
  startedAt: 1000,
  endedAt: 2000,
  durationSeconds: 1,
  distanceMeters: 500,
  direction: 'work',
  ...extra,
});

const original = { startedAt: 1000, endedAt: 2000, durationSeconds: 1, distanceMeters: 500, direction: 'work' as const };

describe('tripEvents', () => {
  it('reports a new trip with only its kind and direction', () => {
    expect(tripEvents([], [trip('a', { auto: true, direction: 'home' })])).toEqual([{ name: 'trip_saved', params: { auto: true, direction: 'home' } }]);
  });

  it('reports edits, but not a re-label after Home or Office changed', () => {
    const edited = trip('a', { distanceMeters: 900, original });
    expect(tripEvents([trip('a')], [edited])).toEqual([{ name: 'trip_edited' }]);
    expect(tripEvents([edited], [{ ...edited, direction: 'home' }])).toEqual([]);
    expect(tripEvents([trip('a')], [trip('a', { direction: 'home' })])).toEqual([]);
  });

  it('counts deletions in one event', () => {
    expect(tripEvents([trip('a'), trip('b')], [])).toEqual([{ name: 'trip_deleted', params: { count: 2 } }]);
  });

  it('ignores sample trips from Developer tools', () => {
    expect(tripEvents([], [trip('sample-20261006-1')])).toEqual([]);
  });
});
