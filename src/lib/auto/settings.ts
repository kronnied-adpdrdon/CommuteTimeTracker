import { KeyValueStore } from '../storage/kv';
import { haversineMeters } from '../tracking/geo';
import { SavedPlaces } from '../trips/direction';

export const AUTO_SETTINGS_KEY = 'autoTracking.v1';

/** Must match the limits in the Android `AutoLogic`. */
export const MIN_RADIUS_METERS = 100;
export const MAX_RADIUS_METERS = 1000;
export const DEFAULT_RADIUS_METERS = 150;

export interface AutoSettings {
  enabled: boolean;
  /** Minutes after midnight. A window covers [start, end) and may cross midnight. */
  morningStart: number;
  morningEnd: number;
  eveningStart: number;
  eveningEnd: number;
  /** JavaScript weekdays: 0 = Sunday ... 6 = Saturday. */
  days: number[];
  /** Circle sizes around Home and Office, in metres. */
  homeRadius: number;
  officeRadius: number;
}

export const DEFAULT_AUTO_SETTINGS: AutoSettings = {
  enabled: false,
  morningStart: 7 * 60,
  morningEnd: 10 * 60,
  eveningStart: 16 * 60,
  eveningEnd: 20 * 60,
  days: [1, 2, 3, 4, 5],
  homeRadius: DEFAULT_RADIUS_METERS,
  officeRadius: DEFAULT_RADIUS_METERS,
};

export interface AutoSettingsStore {
  load(): Promise<AutoSettings>;
  save(settings: AutoSettings): Promise<void>;
}

export function createAutoSettingsStore(store: KeyValueStore): AutoSettingsStore {
  return {
    async load() {
      const raw = await store.get(AUTO_SETTINGS_KEY);
      if (raw === null) return DEFAULT_AUTO_SETTINGS;
      try {
        return sanitize(JSON.parse(raw));
      } catch {
        return DEFAULT_AUTO_SETTINGS;
      }
    },
    save: (settings) => store.set(AUTO_SETTINGS_KEY, JSON.stringify(settings)),
  };
}

/** Keeps only known fields with the right types, so an old or damaged file can't break the screen. */
export function sanitize(value: unknown): AutoSettings {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const minutes = (key: 'morningStart' | 'morningEnd' | 'eveningStart' | 'eveningEnd') => {
    const v = input[key];
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 24 * 60 ? v : DEFAULT_AUTO_SETTINGS[key];
  };
  const radius = (key: 'homeRadius' | 'officeRadius') => {
    const v = input[key];
    return typeof v === 'number' && Number.isFinite(v) ? clampRadius(v) : DEFAULT_AUTO_SETTINGS[key];
  };
  const days = Array.isArray(input.days)
    ? [...new Set(input.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : DEFAULT_AUTO_SETTINGS.days;
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_AUTO_SETTINGS.enabled,
    morningStart: minutes('morningStart'),
    morningEnd: minutes('morningEnd'),
    eveningStart: minutes('eveningStart'),
    eveningEnd: minutes('eveningEnd'),
    days,
    homeRadius: radius('homeRadius'),
    officeRadius: radius('officeRadius'),
  };
}

export function clampRadius(meters: number): number {
  return Math.round(Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, meters)));
}

/** Turns a weekday on or off, keeping the list sorted. */
export function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
}

/** Home and Office so close that their circles touch: crossings can't tell them apart, so the rules stay off. */
export function placesTooClose(places: SavedPlaces, settings: AutoSettings): boolean {
  if (!places.home || !places.office) return false;
  return haversineMeters(places.home, places.office) <= settings.homeRadius + settings.officeRadius;
}
