import { LocationFix } from './geo';

export type LocationErrorKind = 'permission-denied' | 'location-off' | 'unavailable' | 'unknown';

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
          onFix({
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            timestamp: location.time ?? Date.now(),
          });
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
};
