import { LocationFix } from './geo';

export type LocationErrorKind =
  | 'permission-denied'
  | 'location-off'
  /** Location permission is "Approximate", so readings are too coarse to measure a commute. */
  | 'approximate'
  /** No accurate reading arrived in time. */
  | 'timeout'
  | 'unavailable'
  | 'unknown';

/** Android's "Approximate" location is accurate to a kilometre or more; anything worse than this is treated as such. */
export const APPROXIMATE_ACCURACY_METERS = 500;

/** A reading at least this accurate is good enough to save as Home or Office. */
export const PLACE_ACCURACY_METERS = 50;

export interface LocationError {
  kind: LocationErrorKind;
  message: string;
}

/** Anything that can stream GPS readings. The app uses the Capgo plugin; tests use a fake. */
export interface LocationSource {
  /** Errors, including a refused permission, arrive through `onError` rather than as a rejection. */
  start(onFix: (fix: LocationFix) => void, onError: (error: LocationError) => void): Promise<void>;
  stop(): Promise<void>;
  openSettings(): Promise<void>;
  /** One accurate reading, e.g. to save Home or Office. Rejects with a `LocationError`. Don't call while tracking. */
  currentFix(timeoutMs?: number): Promise<LocationFix>;
}

/** The plugin reports both a refused permission and location switched off as `NOT_AUTHORIZED`; only the message differs. */
export function toLocationError(error: unknown): LocationError {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  const text = message ?? String(error);
  if (code === 'NOT_AUTHORIZED') {
    return { kind: /disabled/i.test(text) ? 'location-off' : 'permission-denied', message: text };
  }
  if (code === 'UNIMPLEMENTED' || code === 'UNAVAILABLE' || /not implemented/i.test(text)) {
    return { kind: 'unavailable', message: text };
  }
  return { kind: 'unknown', message: text };
}

type CapgoLocation = import('@capgo/background-geolocation').Location;

const toFix = (location: CapgoLocation): LocationFix => ({
  lat: location.latitude,
  lng: location.longitude,
  accuracy: location.accuracy,
  speed: location.speed,
  timestamp: location.time ?? Date.now(),
});

/** Backed by @capgo/background-geolocation. Imported lazily so the static build never loads native code. */
export const capgoLocationSource: LocationSource = {
  async start(onFix, onError) {
    const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
    try {
      await BackgroundGeolocation.start(
        {
          backgroundTitle: 'Tracking your commute',
          backgroundMessage: 'Tap Stop in the app when you arrive.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 0,
        },
        (location, error) => {
          if (error) {
            onError(toLocationError(error));
            return;
          }
          if (!location) return;
          onFix(toFix(location));
        },
      );
    } catch (error) {
      onError(toLocationError(error));
    }
  },
  async stop() {
    const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
    await BackgroundGeolocation.stop();
  },
  async openSettings() {
    const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
    await BackgroundGeolocation.openSettings();
  },
  async currentFix(timeoutMs = 20_000) {
    const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
    // The plugin has no one-shot call on Android, so watch until an accurate reading arrives, then stop.
    return new Promise<LocationFix>((resolve, reject) => {
      let settled = false;
      let bestAccuracy = Infinity;
      const settle = (finish: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        BackgroundGeolocation.stop()
          .catch(() => undefined)
          .finally(finish);
      };
      const timer = setTimeout(
        () =>
          settle(() =>
            reject(
              bestAccuracy > APPROXIMATE_ACCURACY_METERS && bestAccuracy !== Infinity
                ? ({ kind: 'approximate', message: 'Location is set to Approximate.' } satisfies LocationError)
                : ({ kind: 'timeout', message: 'No accurate location in time.' } satisfies LocationError),
            ),
          ),
        timeoutMs,
      );
      BackgroundGeolocation.start(
        { backgroundTitle: 'Getting your location', backgroundMessage: '', requestPermissions: true, stale: false },
        (location, error) => {
          if (error) return settle(() => reject(toLocationError(error)));
          if (!location) return;
          bestAccuracy = Math.min(bestAccuracy, location.accuracy);
          if (location.accuracy <= PLACE_ACCURACY_METERS) settle(() => resolve(toFix(location)));
        },
      ).catch((error) => settle(() => reject(toLocationError(error))));
    });
  },
};
