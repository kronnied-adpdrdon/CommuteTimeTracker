import { LocationError, LocationSource } from '../tracking/locationSource';
import { LocationFix } from '../tracking/geo';
import {
  ActiveTrip,
  ActiveTripStore,
  applyFix,
  finishTrip,
  isStale,
  recoveryEndTime,
  startTrip,
} from '../trips/activeTrip';
import { PlacesStore } from '../trips/places';
import { TripRepository } from '../trips/repository';
import { Trip } from '../trips/types';

/** A trip shorter than this AND under `MIN_TRIP_METERS` is treated as an accidental tap and not saved. */
export const MIN_TRIP_SECONDS = 60;
export const MIN_TRIP_METERS = 100;

export type CommutePhase = 'loading' | 'idle' | 'tracking' | 'interrupted';

export interface CommuteState {
  phase: CommutePhase;
  /** The trip being tracked, or the interrupted one waiting to be resumed or finished. */
  trip: ActiveTrip | null;
  /** Interrupted only: no readings for so long that resuming makes no sense. */
  stale: boolean;
  /** Saved trips, newest first. */
  trips: Trip[];
  error: LocationError | null;
  /** A one-off message for the user, e.g. that a too-short trip wasn't saved. */
  notice: string | null;
  /** True while a start/stop/finish is in progress, so buttons can't be pressed twice. */
  busy: boolean;
}

export interface CommuteDeps {
  location: LocationSource;
  trips: TripRepository;
  activeTrip: ActiveTripStore;
  places: PlacesStore;
  now?: () => number;
  onStorageError?: (error: unknown) => void;
}

export interface CommuteController {
  getState(): CommuteState;
  subscribe(listener: () => void): () => void;
  /** Loads saved data and detects an interrupted trip. Safe to call more than once. */
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Interrupted trip: carry on tracking it. */
  resume(): Promise<void>;
  /** Interrupted trip: save it, ending at its last reading. */
  finishInterrupted(): Promise<void>;
  /** Interrupted trip: throw it away. */
  discardInterrupted(): Promise<void>;
  openSettings(): Promise<void>;
  dismissMessages(): void;
}

export const INITIAL_COMMUTE_STATE: CommuteState = {
  phase: 'loading',
  trip: null,
  stale: false,
  trips: [],
  error: null,
  notice: null,
  busy: false,
};

export function createCommuteController(deps: CommuteDeps): CommuteController {
  const now = deps.now ?? Date.now;
  const reportStorageError = deps.onStorageError ?? ((error) => console.warn('Saving trip progress failed', error));
  const listeners = new Set<() => void>();
  let state = INITIAL_COMMUTE_STATE;
  let initPromise: Promise<void> | null = null;
  // Bumped whenever a tracking session ends, so late readings or errors from an old session are ignored.
  let session = 0;

  const set = (patch: Partial<CommuteState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const isAccidental = (trip: Trip) => trip.durationSeconds < MIN_TRIP_SECONDS && trip.distanceMeters < MIN_TRIP_METERS;

  async function endSession() {
    session++;
    try {
      await deps.location.stop();
    } catch {
      // Already stopped, or never started.
    }
  }

  async function beginSession(trip: ActiveTrip) {
    const mine = ++session;
    set({ phase: 'tracking', trip, stale: false, error: null, notice: null });

    const onFix = (fix: LocationFix) => {
      if (mine !== session || state.phase !== 'tracking' || !state.trip) return;
      const updated = applyFix(state.trip, fix);
      set({ trip: updated });
      deps.activeTrip.save(updated).catch(reportStorageError);
    };

    const onError = (error: LocationError) => {
      if (mine !== session) return;
      void endSession();
      const current = state.trip;
      if (current && current.lastReadingAt !== undefined) {
        // Some of the trip was recorded: keep it so it can be resumed or finished.
        set({ phase: 'interrupted', trip: current, stale: false, error });
      } else {
        // Nothing recorded (typically a refused permission): drop the empty trip.
        deps.activeTrip.clear().catch(reportStorageError);
        set({ phase: 'idle', trip: null, error });
      }
    };

    // A previous run of the app may have left the native service running.
    try {
      await deps.location.stop();
    } catch {
      // Not running.
    }
    await deps.location.start(onFix, onError);
  }

  async function saveAndClear(trip: ActiveTrip, endedAt: number) {
    const finished = finishTrip(trip, endedAt, await deps.places.load());
    const accidental = isAccidental(finished);
    if (!accidental) await deps.trips.save(finished);
    await deps.activeTrip.clear();
    set({
      phase: 'idle',
      trip: null,
      stale: false,
      trips: await deps.trips.list(),
      notice: accidental ? 'That trip was under a minute, so it was not saved.' : null,
    });
  }

  async function guarded(task: () => Promise<void>) {
    set({ busy: true });
    try {
      await task();
    } finally {
      set({ busy: false });
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    init() {
      initPromise ??= (async () => {
        const [trips, active] = await Promise.all([deps.trips.list(), deps.activeTrip.load()]);
        if (active) {
          set({ phase: 'interrupted', trip: active, stale: isStale(active, now()), trips });
        } else {
          set({ phase: 'idle', trips });
        }
      })();
      return initPromise;
    },

    start: () =>
      state.phase !== 'idle' || state.busy
        ? Promise.resolve()
        : guarded(async () => {
            const trip = startTrip(now());
            await deps.activeTrip.save(trip);
            await beginSession(trip);
          }),

    stop: () =>
      state.phase !== 'tracking' || state.busy || !state.trip
        ? Promise.resolve()
        : guarded(async () => {
            const trip = state.trip!;
            await endSession();
            await saveAndClear(trip, now());
          }),

    resume: () =>
      state.phase !== 'interrupted' || state.busy || state.stale || !state.trip
        ? Promise.resolve()
        : guarded(() => beginSession(state.trip!)),

    finishInterrupted: () =>
      state.phase !== 'interrupted' || state.busy || !state.trip
        ? Promise.resolve()
        : guarded(() => saveAndClear(state.trip!, recoveryEndTime(state.trip!))),

    discardInterrupted: () =>
      state.phase !== 'interrupted' || state.busy
        ? Promise.resolve()
        : guarded(async () => {
            await deps.activeTrip.clear();
            set({ phase: 'idle', trip: null, stale: false, error: null });
          }),

    openSettings: () => deps.location.openSettings(),

    dismissMessages: () => set({ error: null, notice: null }),
  };
}
