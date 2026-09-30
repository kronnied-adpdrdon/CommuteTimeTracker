import { KeyValueStore, createSerialQueue, quarantine } from '../storage/kv';
import { LatLng, LocationFix } from '../tracking/geo';
import { TrackerOptions, TrackerState, addFix, initialTrackerState, totalDistanceMeters } from '../tracking/tracker';
import { SavedPlaces, tagDirection } from './direction';
import { Trip } from './types';

/**
 * A commute in progress. Saved after every reading so it survives the app being killed.
 * It keeps the same id when it becomes a `Trip`, so saving it twice (say, after a crash
 * between saving the trip and clearing this) replaces rather than duplicates.
 */
export interface ActiveTrip {
  version: 1;
  id: string;
  startedAt: number;
  /** First trusted position, once the tracker has one. */
  start?: LatLng;
  /** Time of the latest reading of any kind: the last moment we know the trip was still being tracked. */
  lastReadingAt?: number;
  tracker: TrackerState;
}

/** A trip with no readings for this long is treated as abandoned rather than resumable. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

const toLatLng = ({ lat, lng }: LatLng): LatLng => ({ lat, lng });

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startTrip(now: number, id: string = newId()): ActiveTrip {
  return { version: 1, id, startedAt: now, tracker: initialTrackerState() };
}

export function applyFix(trip: ActiveTrip, fix: LocationFix, options?: TrackerOptions): ActiveTrip {
  const tracker = addFix(trip.tracker, fix, options);
  // The tracker trusts its first position only when a second reading confirms it, and by then it has
  // usually moved on to that second reading. The true start is the reading that was just confirmed.
  const confirmedStart = trip.tracker.anchor === null && tracker.anchor !== null ? trip.tracker.candidate : null;
  return {
    ...trip,
    tracker,
    start: trip.start ?? (confirmedStart ? toLatLng(confirmedStart) : undefined),
    lastReadingAt: Math.max(trip.lastReadingAt ?? 0, fix.timestamp),
  };
}

/** Turns the trip into a saved `Trip`. Pass `Date.now()` when the user taps Stop, or `recoveryEndTime` after a crash. */
export function finishTrip(trip: ActiveTrip, endedAt: number, places: SavedPlaces): Trip {
  const end = trip.tracker.anchor ? toLatLng(trip.tracker.anchor) : undefined;
  const safeEnd = Math.max(endedAt, trip.startedAt);
  return {
    id: trip.id,
    startedAt: trip.startedAt,
    endedAt: safeEnd,
    durationSeconds: Math.round((safeEnd - trip.startedAt) / 1000),
    distanceMeters: Math.round(totalDistanceMeters(trip.tracker)),
    direction: tagDirection(trip.start, end, places),
    start: trip.start,
    end,
  };
}

/** For a trip interrupted by the app being killed: end it at the last reading, not at the time the app reopened. */
export function recoveryEndTime(trip: ActiveTrip): number {
  return trip.lastReadingAt ?? trip.startedAt;
}

export function isStale(trip: ActiveTrip, now: number): boolean {
  return now - recoveryEndTime(trip) > STALE_AFTER_MS;
}

export const ACTIVE_TRIP_KEY = 'activeTrip.v1';

export interface ActiveTripStore {
  load(): Promise<ActiveTrip | null>;
  save(trip: ActiveTrip): Promise<void>;
  clear(): Promise<void>;
}

export function createActiveTripStore(store: KeyValueStore, now: () => number = Date.now): ActiveTripStore {
  // Saves arrive every few seconds; queueing them stops an older save landing after a newer one.
  const enqueue = createSerialQueue();
  return {
    load: () =>
      enqueue(async () => {
        const raw = await store.get(ACTIVE_TRIP_KEY);
        if (raw === null) return null;
        try {
          const parsed = JSON.parse(raw) as ActiveTrip;
          if (parsed?.version === 1 && typeof parsed.id === 'string' && parsed.tracker) return parsed;
        } catch {
          // Fall through to quarantine.
        }
        await quarantine(store, ACTIVE_TRIP_KEY, raw, now());
        return null;
      }),
    save: (trip) => enqueue(() => store.set(ACTIVE_TRIP_KEY, JSON.stringify(trip))),
    clear: () => enqueue(() => store.remove(ACTIVE_TRIP_KEY)),
  };
}
