import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { LocationFix } from '../tracking/geo';
import {
  ACTIVE_TRIP_KEY,
  ActiveTrip,
  STALE_AFTER_MS,
  applyFix,
  createActiveTripStore,
  finishTrip,
  isStale,
  recoveryEndTime,
  startTrip,
} from './activeTrip';
import { createTripRepository } from './repository';

const T0 = new Date(2026, 8, 30, 8, 0).getTime();
const home = { lat: 12.9, lng: 77.6 };
const office = { lat: 12.9 + 5000 / 111_195, lng: 77.6 };

/** A reading `north` metres north of home, `seconds` after T0. */
const at = (north: number, seconds: number): LocationFix => ({
  lat: home.lat + north / 111_195,
  lng: home.lng,
  accuracy: 8,
  timestamp: T0 + seconds * 1000,
});

/** Drive from home to the office at 10 m/s, one reading every 5 s. */
const commute = (): ActiveTrip => {
  let trip = startTrip(T0, 'trip-1');
  for (let d = 0, t = 0; d <= 5000; d += 50, t += 5) trip = applyFix(trip, at(d, t));
  return trip;
};

describe('active trip', () => {
  it('finishing a commute produces a trip with distance, duration, start, end and direction', () => {
    const trip = finishTrip(commute(), T0 + 510_000, { home, office });
    expect(trip.id).toBe('trip-1');
    expect(trip.durationSeconds).toBe(510);
    expect(trip.distanceMeters).toBeCloseTo(5000, -1);
    expect(trip.start).toEqual({ lat: home.lat, lng: home.lng });
    expect(trip.end!.lat).toBeCloseTo(office.lat, 5);
    expect(trip.direction).toBe('work');
  });

  it('saved positions carry no extra reading details', () => {
    const trip = finishTrip(commute(), T0 + 510_000, {});
    expect(Object.keys(trip.start!)).toEqual(['lat', 'lng']);
    expect(Object.keys(trip.end!)).toEqual(['lat', 'lng']);
  });

  it('a trip with no readings still finishes cleanly', () => {
    const trip = finishTrip(startTrip(T0, 'empty'), T0 + 60_000, { home, office });
    expect(trip.distanceMeters).toBe(0);
    expect(trip.start).toBeUndefined();
    expect(trip.direction).toBe('unknown');
  });

  it('an end time before the start is clamped to zero duration', () => {
    expect(finishTrip(startTrip(T0, 'x'), T0 - 5000, {}).durationSeconds).toBe(0);
  });

  it('after a crash, the trip ends at the last reading, not when the app reopened', () => {
    const trip = commute();
    expect(recoveryEndTime(trip)).toBe(T0 + 500_000);
  });

  it('a trip with no readings for over 6 hours is stale; a recent one is not', () => {
    const trip = commute();
    const lastReading = recoveryEndTime(trip);
    expect(isStale(trip, lastReading + 60_000)).toBe(false);
    expect(isStale(trip, lastReading + STALE_AFTER_MS + 1)).toBe(true);
  });
});

describe('ActiveTripStore', () => {
  it('a trip saved mid-commute comes back identical after a restart, and resumes tracking', async () => {
    const store = createMemoryStore();
    const halfway = (() => {
      let trip = startTrip(T0, 'trip-1');
      for (let d = 0, t = 0; d <= 2500; d += 50, t += 5) trip = applyFix(trip, at(d, t));
      return trip;
    })();
    await createActiveTripStore(store).save(halfway);

    const restored = await createActiveTripStore(store).load();
    expect(restored).toEqual(JSON.parse(JSON.stringify(halfway)));

    let resumed = restored!;
    for (let d = 2550, t = 255; d <= 5000; d += 50, t += 5) resumed = applyFix(resumed, at(d, t));
    expect(finishTrip(resumed, T0 + 510_000, {}).distanceMeters).toBeCloseTo(5000, -1);
  });

  it('the latest save wins even when saves overlap', async () => {
    const store = createMemoryStore();
    const active = createActiveTripStore(store);
    const first = startTrip(T0, 'a');
    const second = applyFix(applyFix(first, at(0, 0)), at(50, 5));
    await Promise.all([active.save(first), active.save(second)]);
    expect((await active.load())!.lastReadingAt).toBe(second.lastReadingAt);
  });

  it('clear removes it', async () => {
    const active = createActiveTripStore(createMemoryStore());
    await active.save(startTrip(T0, 'a'));
    await active.clear();
    expect(await active.load()).toBeNull();
  });

  it('unreadable data is set aside, not lost', async () => {
    const store = createMemoryStore({ [ACTIVE_TRIP_KEY]: 'garbage' });
    expect(await createActiveTripStore(store, () => 7).load()).toBeNull();
    expect(store.dump()[`${ACTIVE_TRIP_KEY}.corrupt.7`]).toBe('garbage');
  });

  it('a crash after saving the trip but before clearing it does not create a duplicate', async () => {
    const store = createMemoryStore();
    const repo = createTripRepository(store);
    const active = createActiveTripStore(store);
    const trip = commute();
    await active.save(trip);
    await repo.save(finishTrip(trip, T0 + 510_000, {}));
    // ...app killed here, before active.clear()...
    const recovered = (await active.load())!;
    await repo.save(finishTrip(recovered, recoveryEndTime(recovered), {}));
    await active.clear();
    expect(await repo.list()).toHaveLength(1);
  });
});
