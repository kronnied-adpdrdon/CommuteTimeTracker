import { LatLng, LocationFix } from './geo';

export type LocationErrorKind =
  | 'permission-denied'
  | 'location-off'
  /** Location permission is "Approximate", so readings are too coarse to measure a commute. */
  | 'approximate'
  /** No accurate reading arrived in time. */
  | 'timeout'
  | 'unavailable'
  | 'unknown';

export interface LocationError {
  kind: LocationErrorKind;
  message: string;
}

/** A trip the native recorder is running, or one that was interrupted. */
export interface SessionSnapshot {
  id: string;
  startedAt: number;
  lastReadingAt?: number;
  distanceMeters: number;
  /** False until the recorder has a confirmed first position. */
  hasFix: boolean;
  lastFix?: LocationFix;
}

export interface TrackerSnapshot {
  phase: 'idle' | 'tracking' | 'interrupted';
  session?: SessionSnapshot;
}

/** A trip the recorder finished (from the app, the widget or the notification), waiting to be filed. */
export interface FinishedTrip {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
  start?: LatLng;
  end?: LatLng;
}

/**
 * The native Android trip recorder (`CommuteTrackerPlugin`). It owns GPS, the distance calculation,
 * and the trip in progress, so tracking works from the widget with the app closed.
 * Methods reject with a `LocationError`.
 */
export interface TrackerService {
  getState(): Promise<TrackerSnapshot>;
  /** Shows Android's permission prompts if location hasn't been granted yet. */
  requestPermissions(): Promise<void>;
  start(): Promise<TrackerSnapshot>;
  resume(): Promise<TrackerSnapshot>;
  /** Resolves once the trip has been finished and queued. */
  stop(): Promise<void>;
  /** Interrupted trip: queue it as finished, ending at its last reading. */
  finishInterrupted(): Promise<void>;
  discard(): Promise<void>;
  /** Finished trips not yet filed, oldest first. Clears them from the queue. */
  drainFinished(): Promise<FinishedTrip[]>;
  currentFix(): Promise<LocationFix>;
  openSettings(): Promise<void>;
  refreshWidget(): Promise<void>;
  /** Live updates while a trip runs, and a signal when it ends (including from the widget). */
  subscribe(onUpdate: (snapshot: TrackerSnapshot) => void, onEnded: () => void): void;
}

const ERROR_KINDS: Record<string, LocationErrorKind> = {
  NOT_AUTHORIZED: 'permission-denied',
  APPROXIMATE: 'approximate',
  LOCATION_OFF: 'location-off',
  TIMEOUT: 'timeout',
  UNIMPLEMENTED: 'unavailable',
  UNAVAILABLE: 'unavailable',
};

export function toLocationError(error: unknown): LocationError {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  const text = message ?? String(error);
  if (code && ERROR_KINDS[code]) return { kind: ERROR_KINDS[code], message: text };
  if (/not implemented/i.test(text)) return { kind: 'unavailable', message: text };
  return { kind: 'unknown', message: text };
}

interface CommuteTrackerPlugin {
  getState(): Promise<TrackerSnapshot>;
  checkPermissions(): Promise<{ location: string; notifications: string }>;
  requestPermissions(options: { permissions: ('location' | 'notifications')[] }): Promise<{ location: string }>;
  start(): Promise<TrackerSnapshot>;
  resume(): Promise<TrackerSnapshot>;
  stop(): Promise<void>;
  finishInterrupted(): Promise<void>;
  discard(): Promise<void>;
  drainFinished(): Promise<{ trips: FinishedTrip[] }>;
  currentFix(): Promise<LocationFix>;
  openSettings(): Promise<void>;
  refreshWidget(): Promise<void>;
  addListener(event: 'update', cb: (snapshot: TrackerSnapshot) => void): Promise<unknown>;
  addListener(event: 'ended', cb: () => void): Promise<unknown>;
}

// Wrapped in an object on purpose: a Capacitor plugin proxy must never be the value a promise resolves to,
// because the promise machinery probes it for `.then`, which the proxy turns into a native call that fails.
let pluginPromise: Promise<{ native: CommuteTrackerPlugin }> | null = null;

/** Loaded lazily so the static build never touches native code. Rejects as `unavailable` outside the Android app. */
function plugin(): Promise<{ native: CommuteTrackerPlugin }> {
  pluginPromise ??= (async () => {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      throw { kind: 'unavailable', message: 'Not available in a web browser.' } satisfies LocationError;
    }
    return { native: registerPlugin<CommuteTrackerPlugin>('CommuteTracker') };
  })();
  return pluginPromise;
}

const call = async <T>(run: (p: CommuteTrackerPlugin) => Promise<T>): Promise<T> => {
  try {
    return await run((await plugin()).native);
  } catch (error) {
    if (error && typeof error === 'object' && 'kind' in error) throw error;
    throw toLocationError(error);
  }
};

export const nativeTracker: TrackerService = {
  getState: () => call((p) => p.getState()).catch(() => ({ phase: 'idle' as const })),
  requestPermissions: () =>
    call(async (p) => {
      const current = await p.checkPermissions();
      if (current.location !== 'granted' || current.notifications === 'prompt') {
        await p.requestPermissions({ permissions: ['location', 'notifications'] });
      }
    }),
  start: () => call((p) => p.start()),
  resume: () => call((p) => p.resume()),
  stop: () => call((p) => p.stop()),
  finishInterrupted: () => call((p) => p.finishInterrupted()),
  discard: () => call((p) => p.discard()),
  drainFinished: () => call(async (p) => (await p.drainFinished()).trips).catch(() => []),
  currentFix: () => call((p) => p.currentFix()),
  openSettings: () => call((p) => p.openSettings()),
  refreshWidget: () => call((p) => p.refreshWidget()).catch(() => undefined),
  subscribe(onUpdate, onEnded) {
    void plugin()
      .then(async ({ native }) => {
        await native.addListener('update', onUpdate);
        await native.addListener('ended', onEnded);
      })
      .catch(() => undefined);
  },
};
