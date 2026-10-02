import { KeyValueStore } from '../storage/kv';

export const NOTIFICATION_SETTINGS_KEY = 'notifications.v1';

export interface NotificationSettings {
  /** Free */
  leaveNow: boolean;
  evening: boolean;
  /** Minutes after midnight for the evening reminder, e.g. 1140 = 19:00. */
  eveningMinutes: number;
  weekly: boolean;
  /** Pro */
  monthly: boolean;
  slowDay: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  leaveNow: true,
  evening: true,
  eveningMinutes: 19 * 60,
  weekly: true,
  monthly: true,
  slowDay: true,
};

export interface NotificationSettingsStore {
  load(): Promise<NotificationSettings>;
  save(settings: NotificationSettings): Promise<void>;
}

export function createNotificationSettingsStore(store: KeyValueStore): NotificationSettingsStore {
  return {
    async load() {
      const raw = await store.get(NOTIFICATION_SETTINGS_KEY);
      if (raw === null) return DEFAULT_NOTIFICATION_SETTINGS;
      try {
        return sanitize(JSON.parse(raw));
      } catch {
        return DEFAULT_NOTIFICATION_SETTINGS;
      }
    },
    save: (settings) => store.set(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings)),
  };
}

/** Keeps only known fields with the right types, so an old or damaged file can't break the screen. */
export function sanitize(value: unknown): NotificationSettings {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const flag = (key: keyof NotificationSettings) => (typeof input[key] === 'boolean' ? (input[key] as boolean) : (DEFAULT_NOTIFICATION_SETTINGS[key] as boolean));
  const minutes = input.eveningMinutes;
  return {
    leaveNow: flag('leaveNow'),
    evening: flag('evening'),
    eveningMinutes: typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 0 && minutes < 24 * 60 ? minutes : DEFAULT_NOTIFICATION_SETTINGS.eveningMinutes,
    weekly: flag('weekly'),
    monthly: flag('monthly'),
    slowDay: flag('slowDay'),
  };
}

/** "19:00" for the time input. */
export function minutesToClock(minutes: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Parses "19:00" from the time input; null if it isn't a valid time. */
export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
}
