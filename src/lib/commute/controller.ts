import { LatLng } from '../tracking/geo';
import {
  FinishedTrip,
  LocationError,
  SessionSnapshot,
  TrackerService,
  TrackerSnapshot,
  toLocationError,
} from '../tracking/nativeTracker';
import { SavedPlaces, tagDirection } from '../trips/direction';
import { EditProblem, PlaceKind, TripForm, applyTripForm, retagTrips, withPlace } from '../trips/edit';
import { PlacesStore } from '../trips/places';
import { TripRepository } from '../trips/repository';
import { isSampleTrip } from '../trips/sample';
import { Trip } from '../trips/types';
import { ProBilling } from './billing';
import { ProStore } from './pro';

/** A trip shorter than this AND under `MIN_TRIP_METERS` is treated as an accidental tap and not saved. */
export const MIN_TRIP_SECONDS = 60;
export const MIN_TRIP_METERS = 100;

/** An interrupted trip with no readings for this long can only be saved or discarded, not resumed. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** A reading at least this accurate is good enough to save as Home or Office. */
export const PLACE_ACCURACY_METERS = 50;

/** Shown for a place saved from GPS instead of a typed address. */
export const CURRENT_LOCATION_LABEL = 'Current location';

export type CommutePhase = 'loading' | 'idle' | 'tracking' | 'interrupted';

export interface CommuteState {
  phase: CommutePhase;
  /** The trip being recorded, or the interrupted one waiting to be resumed or finished. */
  session: SessionSnapshot | null;
  /** Interrupted only: no readings for so long that resuming makes no sense. */
  stale: boolean;
  /** Saved trips, newest first. */
  trips: Trip[];
  error: LocationError | null;
  /** A one-off message for the user, e.g. that a too-short trip wasn't saved. */
  notice: string | null;
  /** True while a start/stop/finish is in progress, so buttons can't be pressed twice. */
  busy: boolean;
  places: SavedPlaces;
  /** The user ticked "Don't ask again" on the Home/Office pop-up. Saved across launches. */
  placesPromptNeverAsk: boolean;
  /** The user cancelled the pop-up this time. Not saved, so it comes back the next time the app opens. */
  placesPromptSnoozed: boolean;
  /** Which place is being set from the current location, if any. */
  locating: PlaceKind | null;
  isPro: boolean;
  /** Google Play's localised Pro price, once known. */
  proPrice: string | null;
  /** True while Google Play's purchase sheet is open or a restore is running. */
  purchasing: boolean;
}

export interface CommuteDeps {
  tracker: TrackerService;
  trips: TripRepository;
  places: PlacesStore;
  pro: ProStore;
  /** Google Play Billing. Null in demo builds, where the Pro switch in Settings is used instead. */
  billing: ProBilling | null;
  now?: () => number;
}

export interface CommuteController {
  getState(): CommuteState;
  subscribe(listener: () => void): () => void;
  /** Loads saved data, files trips finished while the app was closed, and picks up a running trip. Runs once. */
  init(): Promise<void>;
  /** Re-reads the recorder, e.g. when the app comes back to the foreground. */
  refresh(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Interrupted trip: carry on recording it. */
  resume(): Promise<void>;
  /** Interrupted trip: save it, ending at its last reading. */
  finishInterrupted(): Promise<void>;
  /** Interrupted trip: throw it away. */
  discardInterrupted(): Promise<void>;
  openSettings(): Promise<void>;
  dismissMessages(): void;
  /** Saves Home or Office from the current location (or the running trip's latest reading). */
  setPlaceHere(kind: PlaceKind): Promise<void>;
  /** Saves Home or Office at a given point (with its address, for display), or clears it with `null`. Re-tags every saved trip. */
  setPlace(kind: PlaceKind, where: LatLng | null, label?: string): Promise<void>;
  /** Cancel on the pop-up: hides it until the app is opened again. */
  snoozePlacesPrompt(): void;
  /** The "Don't ask again" checkbox. */
  setPlacesPromptNeverAsk(neverAsk: boolean): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  /** Saves the edit form for a trip. Returns what's wrong with it, or null once saved (or nothing changed). */
  editTrip(id: string, form: TripForm): Promise<EditProblem | null>;
  deleteAllTrips(): Promise<void>;
  /** Developer tools: replaces any earlier sample trips with these, and saves these Home and Office places. */
  loadSampleData(data: { trips: Trip[]; places: SavedPlaces }): Promise<void>;
  /** Developer tools: removes sample trips, leaving real ones alone. */
  removeSampleData(): Promise<void>;
  /** Developer tools: clears Home and Office and brings the first-launch pop-up back. */
  resetPlacesPrompt(): Promise<void>;
  /** Demo builds only: flip Pro without buying. */
  setPro(isPro: boolean): Promise<void>;
  /** Opens Google Play's purchase sheet for Pro. */
  upgrade(): Promise<void>;
  /** Re-checks what this Google account owns, e.g. on a new phone. */
  restorePurchases(): Promise<void>;
}

export const INITIAL_COMMUTE_STATE: CommuteState = {
  phase: 'loading',
  session: null,
  stale: false,
  trips: [],
  error: null,
  notice: null,
  busy: false,
  places: {},
  placesPromptNeverAsk: false,
  placesPromptSnoozed: false,
  locating: null,
  isPro: false,
  proPrice: null,
  purchasing: false,
};

/** Turns a recorder's finished trip into a saved `Trip`, labelled to work / to home from the saved places. */
export function toTrip(finished: FinishedTrip, places: SavedPlaces): Trip {
  const endedAt = Math.max(finished.endedAt, finished.startedAt);
  return {
    id: finished.id,
    startedAt: finished.startedAt,
    endedAt,
    durationSeconds: Math.round((endedAt - finished.startedAt) / 1000),
    distanceMeters: Math.round(finished.distanceMeters),
    direction: finished.direction ?? tagDirection(finished.start, finished.end, places),
    start: finished.start,
    end: finished.end,
    ...(finished.auto ? { auto: true } : {}),
  };
}

export const isAccidental = (trip: Trip) => trip.durationSeconds < MIN_TRIP_SECONDS && trip.distanceMeters < MIN_TRIP_METERS;

const asLocationError = (error: unknown): LocationError =>
  error && typeof error === 'object' && 'kind' in error ? (error as LocationError) : toLocationError(error);

export function createCommuteController(deps: CommuteDeps): CommuteController {
  const now = deps.now ?? Date.now;
  const listeners = new Set<() => void>();
  let state = INITIAL_COMMUTE_STATE;
  let initPromise: Promise<void> | null = null;

  const set = (patch: Partial<CommuteState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  /** Moves the recorder's phase and session into state. */
  function applySnapshot(snapshot: TrackerSnapshot) {
    const session = snapshot.session ?? null;
    if (snapshot.phase === 'tracking' && session) {
      set({ phase: 'tracking', session, stale: false });
    } else if (snapshot.phase === 'interrupted' && session) {
      const lastSeen = session.lastReadingAt ?? session.startedAt;
      set({ phase: 'interrupted', session, stale: now() - lastSeen > STALE_AFTER_MS });
    } else {
      set({ phase: 'idle', session: null, stale: false });
    }
  }

  /**
   * Files every finished trip waiting in the recorder's queue into History.
   * Returns true if one was dropped as an accidental tap.
   */
  async function fileFinished(): Promise<boolean> {
    const finished = await deps.tracker.drainFinished();
    let droppedAccidental = false;
    for (const raw of finished) {
      const trip = toTrip(raw, state.places);
      if (isAccidental(trip)) droppedAccidental = true;
      else await deps.trips.save(trip);
    }
    if (finished.length) set({ trips: await deps.trips.list() });
    return droppedAccidental;
  }

  async function guarded(task: () => Promise<void>) {
    set({ busy: true });
    try {
      await task();
    } catch (error) {
      set({ error: asLocationError(error) });
    } finally {
      set({ busy: false });
    }
  }

  /**
   * Asks Google Play what this account owns and caches the answer. If Play can't be reached (offline),
   * the cached value stands, so Pro keeps working on a plane.
   */
  async function syncPro(): Promise<boolean | null> {
    if (!deps.billing) return null;
    try {
      const status = await deps.billing.status();
      await deps.pro.save(status.owned);
      set({ isPro: status.owned, proPrice: status.price ?? state.proPrice });
      return status.owned;
    } catch {
      return null;
    }
  }

  async function savePlace(kind: PlaceKind, where: LatLng | null, label?: string) {
    const places = withPlace(state.places, kind, where, label);
    await deps.places.save(places);
    const retagged = retagTrips(await deps.trips.list(), places);
    await deps.trips.replaceAll(retagged);
    set({ places, trips: await deps.trips.list() });
  }

  const controller: CommuteController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    init() {
      initPromise ??= (async () => {
        const [trips, places, placesPromptNeverAsk, isPro] = await Promise.all([
          deps.trips.list(),
          deps.places.load(),
          deps.places.isNeverAsk(),
          deps.pro.load(),
        ]);
        set({ trips, places, placesPromptNeverAsk, isPro });
        await fileFinished();
        applySnapshot(await deps.tracker.getState());
        void syncPro();
        deps.billing?.onUpdated(() => void syncPro());
        deps.tracker.subscribe(
          (snapshot) => {
            if (snapshot.phase === 'tracking') applySnapshot(snapshot);
          },
          () => {
            // Ended anywhere (app, widget, notification): file it and go back to idle.
            void (async () => {
              await fileFinished();
              applySnapshot(await deps.tracker.getState());
            })();
          },
        );
      })();
      return initPromise;
    },

    async refresh() {
      if (state.phase === 'loading') return;
      await fileFinished();
      applySnapshot(await deps.tracker.getState());
    },

    start: () =>
      state.phase !== 'idle' || state.busy || state.locating
        ? Promise.resolve()
        : guarded(async () => {
            set({ error: null, notice: null });
            await deps.tracker.requestPermissions();
            applySnapshot(await deps.tracker.start());
          }),

    stop: () =>
      state.phase !== 'tracking' || state.busy
        ? Promise.resolve()
        : guarded(async () => {
            await deps.tracker.stop();
            const dropped = await fileFinished();
            applySnapshot(await deps.tracker.getState());
            if (dropped) set({ notice: 'That trip was under a minute, so it was not saved.' });
          }),

    resume: () =>
      state.phase !== 'interrupted' || state.busy || state.stale
        ? Promise.resolve()
        : guarded(async () => {
            set({ error: null });
            await deps.tracker.requestPermissions();
            applySnapshot(await deps.tracker.resume());
          }),

    finishInterrupted: () =>
      state.phase !== 'interrupted' || state.busy
        ? Promise.resolve()
        : guarded(async () => {
            await deps.tracker.finishInterrupted();
            await fileFinished();
            applySnapshot(await deps.tracker.getState());
          }),

    discardInterrupted: () =>
      state.phase !== 'interrupted' || state.busy
        ? Promise.resolve()
        : guarded(async () => {
            await deps.tracker.discard();
            applySnapshot(await deps.tracker.getState());
            set({ error: null });
          }),

    openSettings: () => deps.tracker.openSettings().catch(() => undefined),

    dismissMessages: () => set({ error: null, notice: null }),

    async setPlaceHere(kind) {
      if (state.locating || state.busy || state.phase === 'loading') return;
      if (state.phase === 'tracking') {
        // The recorder already has the latest reading; no need for a second GPS request.
        const latest = state.session?.lastFix;
        if (!latest || (latest.accuracy ?? 0) > PLACE_ACCURACY_METERS) {
          set({ error: { kind: 'timeout', message: 'No accurate location yet.' } });
          return;
        }
        await savePlace(kind, latest, CURRENT_LOCATION_LABEL);
        return;
      }
      set({ locating: kind, error: null });
      try {
        await deps.tracker.requestPermissions();
        await savePlace(kind, await deps.tracker.currentFix(), CURRENT_LOCATION_LABEL);
      } catch (error) {
        set({ error: asLocationError(error) });
      } finally {
        set({ locating: null });
      }
    },

    setPlace: (kind, where, label) => savePlace(kind, where, label),

    snoozePlacesPrompt: () => set({ placesPromptSnoozed: true }),

    async setPlacesPromptNeverAsk(neverAsk) {
      set({ placesPromptNeverAsk: neverAsk });
      await deps.places.setNeverAsk(neverAsk);
    },

    async deleteTrip(id) {
      await deps.trips.remove(id);
      set({ trips: await deps.trips.list() });
    },

    async editTrip(id, form) {
      const trip = state.trips.find((t) => t.id === id);
      if (!trip) return null;
      const updated = applyTripForm(trip, form, state.trips, now());
      if (typeof updated === 'string') return updated;
      if (updated === trip) return null;
      await deps.trips.save(updated);
      set({ trips: await deps.trips.list() });
      return null;
    },

    async deleteAllTrips() {
      await deps.trips.clear();
      set({ trips: [] });
    },

    async loadSampleData({ trips, places }) {
      const real = (await deps.trips.list()).filter((t) => !isSampleTrip(t));
      await deps.places.save(places);
      await deps.trips.replaceAll(retagTrips([...real, ...trips], places));
      set({ places, trips: await deps.trips.list() });
    },

    async removeSampleData() {
      await deps.trips.replaceAll((await deps.trips.list()).filter((t) => !isSampleTrip(t)));
      set({ trips: await deps.trips.list() });
    },

    async resetPlacesPrompt() {
      await savePlace('home', null);
      await savePlace('office', null);
      await deps.places.setNeverAsk(false);
      set({ placesPromptNeverAsk: false, placesPromptSnoozed: false });
    },

    async setPro(isPro) {
      await deps.pro.save(isPro);
      set({ isPro });
    },

    async upgrade() {
      if (state.purchasing || state.isPro) return;
      if (!deps.billing) {
        // Demo build: unlock locally.
        await controller.setPro(true);
        return;
      }
      set({ purchasing: true, notice: null });
      try {
        const outcome = await deps.billing.purchase();
        if (outcome === 'purchased') {
          await deps.pro.save(true);
          set({ isPro: true, notice: 'Pro unlocked. Thank you!' });
        } else if (outcome === 'pending') {
          set({ notice: "Payment pending. Pro unlocks automatically once Google Play confirms it." });
        }
      } catch {
        set({ notice: "Couldn't reach Google Play. Check your connection and try again." });
      } finally {
        set({ purchasing: false });
      }
    },

    async restorePurchases() {
      if (state.purchasing || !deps.billing) return;
      set({ purchasing: true, notice: null });
      const owned = await syncPro();
      set({
        purchasing: false,
        notice:
          owned === null
            ? "Couldn't reach Google Play. Check your connection and try again."
            : owned
              ? 'Pro restored.'
              : 'No Pro purchase found on this Google account.',
      });
    },
  };
  return controller;
}
