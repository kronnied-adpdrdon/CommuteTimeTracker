import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { LocationFix } from '../tracking/geo';
import { FinishedTrip, LocationError, SessionSnapshot, TrackerService, TrackerSnapshot } from '../tracking/nativeTracker';
import { createPlacesStore } from '../trips/places';
import { SAMPLE_PLACES, generateSampleTrips, isSampleTrip } from '../trips/sample';
import { createTripRepository } from '../trips/repository';
import { STALE_AFTER_MS, createCommuteController, toTrip } from './controller';
import { ProBilling, ProStatus, PurchaseOutcome } from './billing';
import { createProStore } from './pro';

const T0 = new Date(2026, 8, 30, 8, 0).getTime();
const home = { lat: 12.9, lng: 77.6 };
const office = { lat: 12.9 + 5000 / 111_195, lng: 77.6 };

/**
 * Behaves like the native recorder: owns the session, a finished-trips queue, and fires update/ended
 * events. Trips can also be started/stopped "from the widget" behind the app's back.
 */
function fakeRecorder(clock: () => number) {
  let phase: TrackerSnapshot['phase'] = 'idle';
  let session: SessionSnapshot | undefined;
  let queue: FinishedTrip[] = [];
  let onUpdate: ((s: TrackerSnapshot) => void) | null = null;
  let onEnded: (() => void) | null = null;
  let startError: LocationError | null = null;
  let currentFix: LocationFix | LocationError = { ...home, accuracy: 6, timestamp: T0 };
  const calls = { requestPermissions: 0, start: 0 };

  const snapshot = (): TrackerSnapshot => (session ? { phase, session: { ...session } } : { phase: 'idle' });
  const finish = (endedAt: number) => {
    if (!session) return;
    queue.push({ id: session.id, startedAt: session.startedAt, endedAt, distanceMeters: session.distanceMeters, start: home, end: session.lastFix ? { lat: session.lastFix.lat, lng: session.lastFix.lng } : undefined });
    session = undefined;
    phase = 'idle';
  };

  const service: TrackerService = {
    getState: async () => snapshot(),
    requestPermissions: async () => {
      calls.requestPermissions++;
    },
    start: async () => {
      calls.start++;
      if (startError) throw startError;
      session = { id: `trip-${calls.start}`, startedAt: clock(), distanceMeters: 0, hasFix: false };
      phase = 'tracking';
      return snapshot();
    },
    resume: async () => {
      phase = 'tracking';
      return snapshot();
    },
    stop: async () => finish(clock()),
    finishInterrupted: async () => finish(session?.lastReadingAt ?? session?.startedAt ?? clock()),
    discard: async () => {
      session = undefined;
      phase = 'idle';
    },
    drainFinished: async () => {
      const out = queue;
      queue = [];
      return out;
    },
    currentFix: async () => {
      if ('kind' in currentFix) throw currentFix;
      return currentFix;
    },
    openSettings: async () => {},
    refreshWidget: async () => {},
    subscribe(update, ended) {
      onUpdate = update;
      onEnded = ended;
    },
  };

  return {
    service,
    calls,
    /** The recorder measured more distance (as the native service would after GPS readings). */
    progress(distanceMeters: number, lastFix: LocationFix = { ...office, accuracy: 8, timestamp: clock() }) {
      if (!session) return;
      session = { ...session, distanceMeters, hasFix: true, lastReadingAt: clock(), lastFix };
      onUpdate?.(snapshot());
    },
    /** The widget or notification stopped the trip while the app was open. */
    stopFromWidget() {
      finish(clock());
      onEnded?.();
    },
    /** A trip recorded entirely from the widget while the app was closed. */
    queueWidgetTrip(trip: FinishedTrip) {
      queue.push(trip);
    },
    /** Recorder stopped unexpectedly (phone restarted) with a trip in progress. */
    interrupt(s: SessionSnapshot) {
      session = s;
      phase = 'interrupted';
    },
    failStartWith: (e: LocationError) => (startError = e),
    setCurrentFix: (f: LocationFix | LocationError) => (currentFix = f),
  };
}

function fakeBilling() {
  let status: ProStatus | Error = { owned: false, pending: false, price: '₹49.00' };
  let outcome: PurchaseOutcome | Error = 'purchased';
  const billing: ProBilling = {
    status: async () => {
      if (status instanceof Error) throw status;
      return status;
    },
    purchase: async () => {
      if (outcome instanceof Error) throw outcome;
      if (outcome === 'purchased' && !(status instanceof Error)) status = { ...status, owned: true };
      return outcome;
    },
    onUpdated: () => {},
  };
  return { billing, setStatus: (s: ProStatus | Error) => (status = s), setOutcome: (o: PurchaseOutcome | Error) => (outcome = o) };
}

function setup(store = createMemoryStore(), play: ReturnType<typeof fakeBilling> | null = null) {
  let clock = T0;
  const recorder = fakeRecorder(() => clock);
  const controller = createCommuteController({
    tracker: recorder.service,
    trips: createTripRepository(store),
    places: createPlacesStore(store),
    pro: createProStore(store),
    billing: play?.billing ?? null,
    now: () => clock,
  });
  return { controller, recorder, store, advance: (ms: number) => (clock += ms), setClock: (ms: number) => (clock = ms) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('commute controller', () => {
  it('starts idle with no trips', async () => {
    const { controller } = setup();
    await controller.init();
    expect(controller.getState()).toMatchObject({ phase: 'idle', session: null, trips: [] });
  });

  it('a full commute: asks for permission, tracks, shows live distance, and saves on Stop', async () => {
    const { controller, recorder, advance } = setup();
    await controller.init();
    await controller.start();
    expect(recorder.calls.requestPermissions).toBe(1);
    expect(controller.getState().phase).toBe('tracking');

    advance(300_000);
    recorder.progress(3000);
    expect(controller.getState().session?.distanceMeters).toBe(3000);

    await controller.stop();
    const s = controller.getState();
    expect(s.phase).toBe('idle');
    expect(s.trips).toHaveLength(1);
    expect(s.trips[0]).toMatchObject({ distanceMeters: 3000, durationSeconds: 300 });
  });

  it('a very short trip is treated as an accidental tap and not saved', async () => {
    const { controller, advance } = setup();
    await controller.init();
    await controller.start();
    advance(20_000);
    await controller.stop();
    expect(controller.getState().trips).toHaveLength(0);
    expect(controller.getState().notice).toMatch(/not saved/);
  });

  it('a trip stopped from the widget while the app is open is filed straight away', async () => {
    const { controller, recorder, advance } = setup();
    await controller.init();
    await controller.start();
    advance(600_000);
    recorder.progress(8000);
    recorder.stopFromWidget();
    await flush();
    expect(controller.getState().phase).toBe('idle');
    expect(controller.getState().trips[0].distanceMeters).toBe(8000);
  });

  it('trips recorded from the widget while the app was closed are filed when it opens, labelled by places', async () => {
    const { controller, recorder, store } = setup();
    await createPlacesStore(store).save({ home, office });
    recorder.queueWidgetTrip({ id: 'w1', startedAt: T0, endedAt: T0 + 50 * 60_000, distanceMeters: 5000, start: home, end: office });
    recorder.queueWidgetTrip({ id: 'w2', startedAt: T0 + 3_600_000, endedAt: T0 + 3_610_000, distanceMeters: 0 });
    await controller.init();
    const trips = controller.getState().trips;
    expect(trips.map((t) => t.id)).toEqual(['w1']);
    expect(trips[0].direction).toBe('work');
  });

  it('a trip already running (started from the widget) is picked up when the app opens', async () => {
    const { controller, recorder } = setup();
    await recorder.service.start();
    await controller.init();
    expect(controller.getState().phase).toBe('tracking');
  });

  it('a refused or approximate permission shows the error and stays idle', async () => {
    const { controller, recorder } = setup();
    recorder.failStartWith({ kind: 'approximate', message: 'Location is set to Approximate.' });
    await controller.init();
    await controller.start();
    expect(controller.getState()).toMatchObject({ phase: 'idle', error: { kind: 'approximate' } });
  });

  it('Start pressed twice starts one trip', async () => {
    const { controller, recorder } = setup();
    await controller.init();
    await Promise.all([controller.start(), controller.start()]);
    expect(recorder.calls.start).toBe(1);
  });
});

describe('interrupted trips', () => {
  const interrupted = (lastReadingAt: number): SessionSnapshot => ({ id: 'i1', startedAt: T0, lastReadingAt, distanceMeters: 4000, hasFix: true });

  it('shows as interrupted; Save ends it at the last reading, not now', async () => {
    const { controller, recorder, setClock } = setup();
    recorder.interrupt(interrupted(T0 + 30 * 60_000));
    setClock(T0 + 3 * 3_600_000);
    await controller.init();
    expect(controller.getState()).toMatchObject({ phase: 'interrupted', stale: false });
    await controller.finishInterrupted();
    expect(controller.getState().trips[0]).toMatchObject({ durationSeconds: 1800, distanceMeters: 4000 });
  });

  it('resume carries on recording', async () => {
    const { controller, recorder } = setup();
    recorder.interrupt(interrupted(T0 + 60_000));
    await controller.init();
    await controller.resume();
    expect(controller.getState().phase).toBe('tracking');
  });

  it('a long-abandoned trip is stale and cannot be resumed', async () => {
    const { controller, recorder, setClock } = setup();
    recorder.interrupt(interrupted(T0));
    setClock(T0 + STALE_AFTER_MS + 60_000);
    await controller.init();
    expect(controller.getState().stale).toBe(true);
    await controller.resume();
    expect(controller.getState().phase).toBe('interrupted');
  });

  it('discard saves nothing', async () => {
    const { controller, recorder } = setup();
    recorder.interrupt(interrupted(T0));
    await controller.init();
    await controller.discardInterrupted();
    expect(controller.getState()).toMatchObject({ phase: 'idle', trips: [] });
  });
});

describe('places', () => {
  it('setting Home and Office re-tags trips already recorded', async () => {
    const { controller, recorder, advance } = setup();
    await controller.init();
    await controller.start();
    advance(600_000);
    recorder.progress(5000);
    await controller.stop();
    expect(controller.getState().trips[0].direction).toBe('unknown');
    await controller.setPlace('home', home);
    await controller.setPlace('office', office);
    expect(controller.getState().trips[0].direction).toBe('work');
  });

  it('I am here now saves the current location and survives a restart', async () => {
    const { controller, store } = setup();
    await controller.init();
    await controller.setPlaceHere('home');
    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().places.home).toMatchObject(home);
  });

  it('a failed reading shows the error and saves nothing', async () => {
    const { controller, recorder } = setup();
    recorder.setCurrentFix({ kind: 'timeout', message: 'No accurate location in time.' });
    await controller.init();
    await controller.setPlaceHere('office');
    expect(controller.getState()).toMatchObject({ error: { kind: 'timeout' }, locating: null });
    expect(controller.getState().places.office).toBeUndefined();
  });

  it("while tracking, I'm here now uses the recorder's latest reading", async () => {
    const { controller, recorder } = setup();
    await controller.init();
    await controller.start();
    recorder.progress(500, { lat: 12.95, lng: 77.6, accuracy: 7, timestamp: T0 });
    await controller.setPlaceHere('office');
    expect(controller.getState().places.office).toEqual({ lat: 12.95, lng: 77.6, label: 'Current location' });
  });

  it('Cancel hides the prompt only until the app is opened again', async () => {
    const { controller, store } = setup();
    await controller.init();
    controller.snoozePlacesPrompt();
    expect(controller.getState().placesPromptSnoozed).toBe(true);
    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().placesPromptSnoozed).toBe(false);
    expect(restarted.getState().placesPromptNeverAsk).toBe(false);
  });

  it("Don't ask again is remembered, and can be undone", async () => {
    const { controller, store } = setup();
    await controller.init();
    await controller.setPlacesPromptNeverAsk(true);
    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().placesPromptNeverAsk).toBe(true);
    await restarted.setPlacesPromptNeverAsk(false);
    const again = setup(store).controller;
    await again.init();
    expect(again.getState().placesPromptNeverAsk).toBe(false);
  });

  it('ignores the "Maybe later" flag left by version 1.0, so the pop-up still appears after an update', async () => {
    const { controller, store } = setup();
    await store.set('placesPromptDismissed.v1', 'true');
    await controller.init();
    expect(controller.getState().placesPromptNeverAsk).toBe(false);
  });

  it('keeps the address chosen for a place', async () => {
    const { controller } = setup();
    await controller.init();
    await controller.setPlace('home', home, '12 Park Street, Bengaluru');
    expect(controller.getState().places.home).toEqual({ ...home, label: '12 Park Street, Bengaluru' });
    await controller.setPlace('home', null);
    expect(controller.getState().places.home).toBeUndefined();
  });
});

describe('sample data (developer tools)', () => {
  it('loads sample trips and addresses, keeping real trips, and can remove just the samples', async () => {
    const { controller, recorder, advance } = setup();
    await controller.init();
    await controller.start();
    advance(305_000);
    recorder.progress(2000, { lat: 12.95, lng: 77.6, accuracy: 7, timestamp: T0 });
    await controller.stop();
    const real = controller.getState().trips.length;
    expect(real).toBe(1);

    const data = generateSampleTrips(T0);
    await controller.loadSampleData(data);
    expect(controller.getState().places.home?.label).toBe(SAMPLE_PLACES.home?.label);
    expect(controller.getState().trips.length).toBe(real + data.trips.length);

    // Loading again replaces the samples instead of doubling them.
    await controller.loadSampleData(data);
    expect(controller.getState().trips.length).toBe(real + data.trips.length);

    await controller.removeSampleData();
    expect(controller.getState().trips.length).toBe(real);
    expect(controller.getState().trips.some(isSampleTrip)).toBe(false);
  });

  it('can bring the first-launch pop-up back', async () => {
    const { controller } = setup();
    await controller.init();
    await controller.loadSampleData(generateSampleTrips(T0));
    await controller.setPlacesPromptNeverAsk(true);
    controller.snoozePlacesPrompt();
    await controller.resetPlacesPrompt();
    const state = controller.getState();
    expect(state.places).toEqual({});
    expect(state.placesPromptNeverAsk).toBe(false);
    expect(state.placesPromptSnoozed).toBe(false);
  });
});

describe('editing trips', () => {
  async function withOneTrip() {
    const ctx = setup();
    await ctx.controller.init();
    await ctx.controller.start();
    ctx.advance(305_000);
    ctx.recorder.progress(3000);
    await ctx.controller.stop();
    return ctx;
  }

  it('changing the end time recalculates duration and keeps distance', async () => {
    const { controller } = await withOneTrip();
    const trip = controller.getState().trips[0];
    expect(await controller.setTripEndClock(trip.id, '08:03')).toBe(true);
    expect(controller.getState().trips[0]).toMatchObject({ durationSeconds: 180, distanceMeters: trip.distanceMeters });
  });

  it('a nonsense end time is refused and nothing changes', async () => {
    const { controller } = await withOneTrip();
    const trip = controller.getState().trips[0];
    expect(await controller.setTripEndClock(trip.id, '99:99')).toBe(false);
    expect(controller.getState().trips[0]).toEqual(trip);
  });

  it('deletes one trip, or all of them', async () => {
    const { controller, store } = await withOneTrip();
    await controller.deleteTrip(controller.getState().trips[0].id);
    expect(controller.getState().trips).toHaveLength(0);
    await controller.deleteAllTrips();
    expect(await createTripRepository(store).list()).toHaveLength(0);
  });
});

describe('Pro', () => {
  it('starts as Free, and Pro survives a restart', async () => {
    const { controller, store } = setup();
    await controller.init();
    expect(controller.getState().isPro).toBe(false);
    await controller.setPro(true);
    const restarted = setup(store).controller;
    await restarted.init();
    expect(restarted.getState().isPro).toBe(true);
  });
});

describe('toTrip', () => {
  it('builds duration, rounds distance and tags direction', () => {
    const trip = toTrip({ id: 'x', startedAt: T0, endedAt: T0 + 61_500, distanceMeters: 4999.6, start: home, end: office }, { home, office });
    expect(trip).toMatchObject({ durationSeconds: 62, distanceMeters: 5000, direction: 'work' });
  });
  it('an end before the start becomes zero duration', () => {
    expect(toTrip({ id: 'x', startedAt: T0, endedAt: T0 - 1, distanceMeters: 0 }, {}).durationSeconds).toBe(0);
  });
});

describe('Google Play billing', () => {
  it('shows Play\'s price and stays Free when nothing is owned', async () => {
    const play = fakeBilling();
    const { controller } = setup(createMemoryStore(), play);
    await controller.init();
    await flush();
    expect(controller.getState()).toMatchObject({ isPro: false, proPrice: '₹49.00' });
  });

  it('a completed purchase unlocks Pro and survives a restart', async () => {
    const play = fakeBilling();
    const { controller, store } = setup(createMemoryStore(), play);
    await controller.init();
    await controller.upgrade();
    expect(controller.getState()).toMatchObject({ isPro: true, notice: 'Pro unlocked. Thank you!' });
    const restarted = setup(store, play).controller;
    await restarted.init();
    await flush();
    expect(restarted.getState().isPro).toBe(true);
  });

  it('a cancelled purchase changes nothing; a pending one says so', async () => {
    const play = fakeBilling();
    const { controller } = setup(createMemoryStore(), play);
    await controller.init();
    play.setOutcome('cancelled');
    await controller.upgrade();
    expect(controller.getState()).toMatchObject({ isPro: false, notice: null });
    play.setOutcome('pending');
    await controller.upgrade();
    expect(controller.getState().notice).toMatch(/pending/i);
  });

  it('restore finds an earlier purchase on a new phone', async () => {
    const play = fakeBilling();
    play.setStatus({ owned: true, pending: false });
    const { controller } = setup(createMemoryStore(), play);
    await controller.init();
    await controller.restorePurchases();
    expect(controller.getState()).toMatchObject({ isPro: true, notice: 'Pro restored.' });
  });

  it('a refund removes Pro at the next check', async () => {
    const play = fakeBilling();
    const store = createMemoryStore();
    await createProStore(store).save(true);
    play.setStatus({ owned: false, pending: false });
    const { controller } = setup(store, play);
    await controller.init();
    await flush();
    expect(controller.getState().isPro).toBe(false);
  });

  it('offline: keeps the cached Pro and explains on restore', async () => {
    const play = fakeBilling();
    const store = createMemoryStore();
    await createProStore(store).save(true);
    play.setStatus(new Error('offline'));
    const { controller } = setup(store, play);
    await controller.init();
    await flush();
    expect(controller.getState().isPro).toBe(true);
    await controller.restorePurchases();
    expect(controller.getState().notice).toMatch(/Couldn't reach Google Play/);
  });
});
