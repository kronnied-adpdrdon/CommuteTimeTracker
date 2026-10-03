import { describe, expect, it } from 'vitest';
import { TripForm, applyTripForm, distanceFromInput, endTimeFromClock, isEdited, retagTrips, speedWarning, tripForm, withPlace } from './edit';
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

const NOW = at(18, 0);

describe('applyTripForm', () => {
  const edit = (patch: Partial<TripForm>, others: Trip[] = []) => applyTripForm(trip, { ...tripForm(trip), ...patch }, others, NOW);

  it('fixes a forgotten Stop: shorter duration, same distance, originals kept', () => {
    const fixed = edit({ endClock: '09:05' }) as Trip;
    expect(fixed.durationSeconds).toBe(65 * 60);
    expect(fixed.distanceMeters).toBe(12000);
    expect(fixed.original).toEqual({ startedAt: at(8, 0), endedAt: at(11, 30), durationSeconds: 3.5 * 3600, distanceMeters: 12000, direction: 'unknown' });
    expect(isEdited(fixed)).toBe(true);
  });
  it('changes the start time on the same day', () => {
    const fixed = edit({ startClock: '07:45' }) as Trip;
    expect(fixed.startedAt).toBe(at(7, 45));
    expect(fixed.durationSeconds).toBe(3.75 * 3600);
  });
  it('changes the distance', () => {
    expect((edit({ distanceKm: '14,2' }) as Trip).distanceMeters).toBe(14200);
  });
  it('an untouched form returns the same trip, not an edited copy', () => {
    expect(edit({})).toBe(trip);
    expect(isEdited(trip)).toBe(false);
  });
  it('untouched times keep their recorded seconds', () => {
    const withSeconds = { ...trip, startedAt: at(8, 0) + 12_000, endedAt: at(8, 40) + 5_000, durationSeconds: 2393 };
    expect(applyTripForm(withSeconds, tripForm(withSeconds), [], NOW)).toBe(withSeconds);
    const farther = applyTripForm(withSeconds, { ...tripForm(withSeconds), distanceKm: '15' }, [], NOW) as Trip;
    expect(farther).toMatchObject({ startedAt: withSeconds.startedAt, endedAt: withSeconds.endedAt, durationSeconds: 2393 });
  });
  it('a second edit keeps the first originals', () => {
    const once = edit({ endClock: '09:05' }) as Trip;
    const twice = applyTripForm(once, { ...tripForm(once), endClock: '09:10' }, [], NOW) as Trip;
    expect(twice.original?.endedAt).toBe(at(11, 30));
  });
  it('a changed direction is remembered as the user\'s choice', () => {
    expect(edit({ direction: 'work' })).toMatchObject({ direction: 'work', directionByUser: true });
    expect(edit({ endClock: '09:05' })).not.toHaveProperty('directionByUser');
  });
  it('refuses bad input', () => {
    expect(edit({ endClock: '' })).toBe('bad-time');
    expect(edit({ startClock: 'abc' })).toBe('bad-time');
    expect(edit({ distanceKm: 'abc' })).toBe('bad-distance');
    expect(edit({ distanceKm: '-3' })).toBe('bad-distance');
    expect(edit({ distanceKm: '5000' })).toBe('bad-distance');
    expect(edit({ endClock: '08:00' })).toBe('too-long');
    expect(edit({ endClock: '19:00' })).toBe('in-future');
  });
  it('refuses times that overlap another trip, but allows touching it', () => {
    const other = { ...trip, id: 'other', startedAt: at(12, 0), endedAt: at(12, 30) };
    expect(edit({ endClock: '12:15' }, [other])).toBe('overlap');
    expect(edit({ endClock: '12:00' }, [other])).toMatchObject({ endedAt: at(12, 0) });
    expect(edit({ endClock: '09:00' }, [trip])).toMatchObject({ endedAt: at(9, 0) });
  });
});

describe('distanceFromInput', () => {
  it('keeps the exact recorded metres while the field still shows them', () => {
    expect(distanceFromInput('12.3', 12345)).toBe(12345);
    expect(distanceFromInput(' 12,3 ', 12345)).toBe(12345);
  });
  it('reads km with a dot or comma', () => {
    expect(distanceFromInput('8', 12345)).toBe(8000);
    expect(distanceFromInput('8.25', 12345)).toBe(8250);
    expect(distanceFromInput('.5', 12345)).toBe(500);
    expect(distanceFromInput('', 12345)).toBeNull();
  });
});

describe('speedWarning', () => {
  const warn = (patch: Partial<TripForm>) => speedWarning(trip, { ...tripForm(trip), ...patch });
  it('warns when the times and distance imply driving too fast', () => {
    expect(warn({ endClock: '08:05' })).toEqual({ kind: 'fast', kmh: 144 });
  });
  it('warns when a long trip is slower than walking', () => {
    expect(warn({ distanceKm: '1' })).toEqual({ kind: 'slow', kmh: 0.3 });
  });
  it('stays quiet for normal trips, short slow ones and unreadable input', () => {
    expect(warn({ endClock: '08:40' })).toBeNull();
    expect(warn({ endClock: '08:10', distanceKm: '0.1' })).toBeNull();
    expect(warn({ endClock: 'x' })).toBeNull();
  });
});

describe('retagTrips', () => {
  it('tags old trips once Home and Office are known', () => {
    const [tagged] = retagTrips([trip], { home: trip.start, office: trip.end });
    expect(tagged.direction).toBe('work');
  });
  it('keeps the direction of an automatic trip', () => {
    const [kept] = retagTrips([{ ...trip, direction: 'home', auto: true }], { home: trip.start, office: trip.end });
    expect(kept.direction).toBe('home');
  });
  it('keeps a direction the user picked', () => {
    const [kept] = retagTrips([{ ...trip, direction: 'home', directionByUser: true }], { home: trip.start, office: trip.end });
    expect(kept.direction).toBe('home');
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
