import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { LocationFix } from '../tracking/geo';
import { LocationError, LocationSource, toLocationError } from '../tracking/locationSource';
import { STALE_AFTER_MS, applyFix, createActiveTripStore, startTrip } from '../trips/activeTrip';
import { createPlacesStore } from '../trips/places';
import { createTripRepository } from '../trips/repository';
import { createCommuteController } from './controller';

const T0 = new Date(2026, 8, 30, 8, 0).getTime();

/** A reading `north` metres north of a fixed point at absolute time `ms`. */
const at = (north: number, ms: number): LocationFix => ({
  lat: 12.9 + north / 111_195,
  lng: 77.6,
  accuracy: 8,
  timestamp: ms,
});

function fakeLocation() {
  let onFix: ((fix: LocationFix) => void) | null = null;
  let onError: ((error: LocationError) => void) | null = null;
  const source: LocationSource & { running: boolean; starts: number } = {
    running: false,
    starts: 0,
    async start(fix, error) {
      onFix = fix;
      onError = error;
      source.running = true;
      source.starts++;
    },
    async stop() {
      source.running = false;
    },
    async openSettings() {},
    async currentFix() {
      if (nextCurrentFix instanceof Error || (nextCurrentFix && 'kind' in nextCurrentFix)) throw nextCurrentFix;
      return nextCurrentFix ?? at(0, Date.now());
    },
  };
  let nextCurrentFix: LocationFix | LocationError | null = null;
  return {
    source,
    /** Sends readings using the handlers from the latest start, like a real late callback would. */
    emit: (fix: LocationFix) => onFix?.(fix),
    fail: (error: LocationError) => onError?.(error),
    /** What the next one-off reading (Set Home here) returns or throws. */
    setCurrentFix: (value: LocationFix | LocationError) => (nextCurrentFix = value),
  };
}

function setup(store = createMemoryStore()) {
  let clock = T0;
  const gps = fakeLocation();
  const controller = createCommuteController({
    location: gps.source,
    trips: createTripRepository(store),
    activeTrip: createActiveTripStore(store),
    places: createPlacesStore(store),
    now: () => clock,
    onStorageError: (e) => {
      throw e;
    },
  });
  /** Drive north at 10 m/s, one reading every 5 s, advancing the clock. */
  const drive = (fromMeters: number, toMeters: number) => {
    for (let d = fromMeters; d <= toMeters; d += 50) {
      gps.emit(at(d, clock));
      clock += 5000;
    }
  };
  return { controller, gps, store, drive, setClock: (ms: number) => (clock = ms), clock: () => clock };
}

/** Lets queued storage writes finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('commute controller', () => {
  it('starts idle with no trips', async () => {
    const { controller } = setup();
    await controller.init();
    expect(controller.getState()).toMatchObject({ phase: 'idle', trips: [] });
  });

  it('a full commute: start, readings, stop saves one trip', async () => {
    const { controller, gps, drive } = setup();
    await controller.init();
    await controller.start();
    expect(controller.getState().phase).toBe('tracking');
    expect(gps.source.running).toBe(true);

    drive(0, 3000);
    await controller.stop();

    const s = controller.getState();
    expect(s.phase).toBe('idle');
    expect(gps.source.running).toBe(false);
    expect(s.trips).toHaveLength(1);
    expect(s.trips[0].distanceMeters).toBeCloseTo(3000, -1);
    expect(s.trips[0].durationSeconds).toBe(305);
  });

  it('the trip in progress is saved, so a restart finds it interrupted', async () => {
    const { controller, drive, store } = setup();
    await controller.init();
    await controller.start();
    drive(0, 1000);
    await settle();

    // App killed. A fresh controller over the same storage:
    const restarted = setup(store).controller;
    await restarted.init();
    const s = restarted.getState();
    expect(s.phase).toBe('interrupted');
    expect(s.stale).toBe(false);
    expect(s.trip!.lastReadingAt).toBe(T0 + 100_000);
  });

  it('finishing an interrupted trip ends it at the last reading', async () => {
    const first = setup();
    await first.controller.init();
    await first.controller.start();
    first.drive(0, 1000);
    await settle();

    const second = setup(first.store);
    second.setClock(T0 + 3 * 60 * 60 * 1000); // reopened 3 hours later
    await second.controller.init();
    await second.controller.finishInterrupted();
    const trip = second.controller.getState().trips[0];
    expect(trip.durationSeconds).toBe(100);
    expect(trip.distanceMeters).toBeCloseTo(1000, -1);
  });

  it('resuming an interrupted trip keeps adding to it', async () => {
    const first = setup();
    await first.controller.init();
    await first.controller.start();
    first.drive(0, 1000);
    await settle();

    const second = setup(first.store);
    second.setClock(first.clock());
    await second.controller.init();
    await second.controller.resume();
    expect(second.controller.getState().phase).toBe('tracking');
    second.drive(1050, 2000);
    await second.controller.stop();
    expect(second.controller.getState().trips[0].distanceMeters).toBeCloseTo(2000, -1);
  });

  it('a long-abandoned trip is stale and cannot be resumed', async () => {
    const store = createMemoryStore();
    const old = applyFix(applyFix(startTrip(T0, 'old'), at(0, T0)), at(50, T0 + 5000));
    await createActiveTripStore(store).save(old);
    const { controller, gps, setClock } = setup(store);
    setClock(T0 + STALE_AFTER_MS + 60_000);
    await controller.init();
    expect(controller.getState()).toMatchObject({ phase: 'interrupted', stale: true });
    await controller.resume();
    expect(controller.getState().phase).toBe('interrupted');
    expect(gps.source.starts).toBe(0);
  });

  it('discarding an interrupted trip saves nothing', async () => {
    const store = createMemoryStore();
    await createActiveTripStore(store).save(startTrip(T0, 'x'));
    const { controller } = setup(store);
    await controller.init();
    await controller.discardInterrupted();
    expect(controller.getState()).toMatchObject({ phase: 'idle', trips: [] });
    expect(await createActiveTripStore(store).load()).toBeNull();
  });

  it('a refused permission at start returns to idle with an error and leaves nothing behind', async () => {
    const { controller, gps, store } = setup();
    await controller.init();
    await controller.start();
    gps.fail({ kind: 'permission-denied', message: 'User denied location permission' });
    await settle();
    const s = controller.getState();
    expect(s.phase).toBe('idle');
    expect(s.error?.kind).toBe('permission-denied');
    expect(await createActiveTripStore(store).load()).toBeNull();
  });

  it('an error mid-trip keeps the trip as interrupted', async () => {
    const { controller, gps, drive } = setup();
    await controller.init();
    await controller.start();
    drive(0, 500);
    gps.fail({ kind: 'location-off', message: 'Location services disabled.' });
    const s = controller.getState();
    expect(s.phase).toBe('interrupted');
    expect(s.error?.kind).toBe('location-off');
    expect(s.trip!.lastReadingAt).toBeDefined();
  });

  it('a very short trip is treated as an accidental tap and not saved', async () => {
    const { controller, gps, setClock } = setup();
    await controller.init();
    await controller.start();
    gps.emit(at(0, T0));
    setClock(T0 + 20_000);
    await controller.stop();
    const s = controller.getState();
    expect(s.trips).toHaveLength(0);
    expect(s.notice).toMatch(/not saved/);
  });

  it('readings that arrive after Stop are ignored', async () => {
    const { controller, gps, drive, clock } = setup();
    await controller.init();
    await controller.start();
    drive(0, 1000);
    await controller.stop();
    gps.emit(at(5000, clock() + 5000));
    expect(controller.getState().phase).toBe('idle');
    expect(controller.getState().trip).toBeNull();
  });

  it('Start pressed twice starts one trip', async () => {
    const { controller, gps } = setup();
    await controller.init();
    await Promise.all([controller.start(), controller.start()]);
    expect(gps.source.starts).toBe(1);
  });
});

describe('toLocationError', () => {
  it('tells a refused permission apart from location being switched off', () => {
    expect(toLocationError({ code: 'NOT_AUTHORIZED', message: 'User denied location permission' }).kind).toBe(
      'permission-denied',
    );
    expect(toLocationError({ code: 'NOT_AUTHORIZED', message: 'Location services disabled.' }).kind).toBe(
      'location-off',
    );
  });
  it('recognises a platform without the plugin', () => {
    expect(toLocationError({ code: 'UNIMPLEMENTED', message: 'Not implemented on web.' }).kind).toBe('unavailable');
  });
  it('anything else is unknown', () => {
    expect(toLocationError(new Error('boom')).kind).toBe('unknown');
  });
});

describe('places', () => {
  const home = { lat: 12.9, lng: 77.6 };
  const officeNorth = 5000;

  it('setting Home and Office re-tags trips already recorded', async () => {
    const { controller, drive } = setup();
    await controller.init();
    await controller.start();
    drive(0, officeNorth);
    await controller.stop();
    expect(controller.getState().trips[0].direction).toBe('unknown');

    await controller.setPlace('home', home);
    await controller.setPlace('office', { lat: 12.9 + officeNorth / 111_195, lng: 77.6 });
    expect(controller.getState().trips[0].direction).toBe('work');
  });

  it('Set Home here saves the current location, survives a restart, and closes the prompt', async () => {
    const { controller, gps, store } = setup();
    gps.setCurrentFix({ ...at(0, T0), accuracy: 6 });
    await controller.init();
    await controller.setPlaceHere('home');
    expect(controller.getState().places.home).toEqual(home);

    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().places.home).toEqual(home);
  });

  it('a failed one-off reading shows the error and saves nothing', async () => {
    const { controller, gps } = setup();
    gps.setCurrentFix({ kind: 'approximate', message: 'Location is set to Approximate.' });
    await controller.init();
    await controller.setPlaceHere('office');
    expect(controller.getState().error?.kind).toBe('approximate');
    expect(controller.getState().places.office).toBeUndefined();
    expect(controller.getState().locating).toBeNull();
  });

  it('while tracking, Set Home here uses the trip\'s latest reading', async () => {
    const { controller, gps, drive } = setup();
    await controller.init();
    await controller.start();
    drive(0, 500);
    await controller.setPlaceHere('office');
    expect(controller.getState().places.office!.lat).toBeCloseTo(12.9 + 500 / 111_195, 6);
    expect(gps.source.starts).toBe(1);
  });

  it('clearing a place removes it', async () => {
    const { controller } = setup();
    await controller.init();
    await controller.setPlace('home', home);
    await controller.setPlace('home', null);
    expect(controller.getState().places).toEqual({});
  });

  it('Later hides the first-launch prompt for good', async () => {
    const { controller, store } = setup();
    await controller.init();
    await controller.dismissPlacesPrompt();
    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().placesPromptDismissed).toBe(true);
  });
});

describe('editing trips', () => {
  async function withOneTrip() {
    const ctx = setup();
    await ctx.controller.init();
    await ctx.controller.start();
    ctx.drive(0, 3000);
    await ctx.controller.stop();
    return ctx;
  }

  it('changing the end time recalculates duration and keeps distance', async () => {
    const { controller } = await withOneTrip();
    const trip = controller.getState().trips[0];
    expect(await controller.setTripEndClock(trip.id, '08:03')).toBe(true);
    const edited = controller.getState().trips[0];
    expect(edited.durationSeconds).toBe(180);
    expect(edited.distanceMeters).toBe(trip.distanceMeters);
  });

  it('a nonsense end time is refused and nothing changes', async () => {
    const { controller } = await withOneTrip();
    const trip = controller.getState().trips[0];
    expect(await controller.setTripEndClock(trip.id, '99:99')).toBe(false);
    expect(controller.getState().trips[0]).toEqual(trip);
  });

  it('deletes one trip, or all of them', async () => {
    const { controller } = await withOneTrip();
    await controller.deleteTrip(controller.getState().trips[0].id);
    expect(controller.getState().trips).toHaveLength(0);
  });

  it('delete all removes every trip', async () => {
    const { controller, store } = await withOneTrip();
    await controller.deleteAllTrips();
    expect(controller.getState().trips).toHaveLength(0);
    expect(await createTripRepository(store).list()).toHaveLength(0);
  });
});

describe('precision warning', () => {
  it('warns after a few Approximate-level readings and clears once readings are precise', async () => {
    const { controller, gps } = setup();
    await controller.init();
    await controller.start();
    for (let i = 0; i < 3; i++) gps.emit({ ...at(0, T0 + i * 5000), accuracy: 2000 });
    expect(controller.getState().precisionWarning).toBe(true);
    gps.emit({ ...at(0, T0 + 20_000), accuracy: 8 });
    expect(controller.getState().precisionWarning).toBe(false);
  });
});
