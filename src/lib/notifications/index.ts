'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { commute } from '../commute';
import { isNativeApp, lazyPlugin } from '../native';
import { KeyValueStore } from '../storage/kv';
import { DEFAULT_NOTIFICATION_SETTINGS, NotificationSettings, createNotificationSettingsStore } from './settings';

interface RemindersPlugin {
  configure(config: Record<string, unknown>): Promise<void>;
  canNotify(): Promise<{ allowed: boolean }>;
  sendTest(): Promise<void>;
  requestPermissions(options: { permissions: 'notifications'[] }): Promise<unknown>;
}

const plugin = lazyPlugin<RemindersPlugin>('Reminders');

const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

const store = createNotificationSettingsStore(preferences);

export interface NotificationsState {
  settings: NotificationSettings;
  loaded: boolean;
  /** Whether Android will actually show our notifications. Null until checked, or in a browser. */
  allowed: boolean | null;
}

const INITIAL: NotificationsState = { settings: DEFAULT_NOTIFICATION_SETTINGS, loaded: false, allowed: null };

let state = INITIAL;
const listeners = new Set<() => void>();
const set = (patch: Partial<NotificationsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

let lastPushed = '';

/** Tells the Android side what to schedule. It reads trips itself when each reminder fires, so this only carries choices. */
async function push(): Promise<void> {
  const app = commute.getState();
  if (!state.loaded || app.phase === 'loading' || !(await isNativeApp())) return;
  const config = {
    ...state.settings,
    isPro: app.isPro,
    // The "set your addresses" reminder only runs while Home or Office is missing.
    setup: !(app.places.home && app.places.office),
  };
  const key = JSON.stringify(config);
  if (key === lastPushed) return;
  lastPushed = key;
  try {
    await (await plugin()).native.configure(config);
  } catch {
    lastPushed = '';
  }
}

export async function refreshAllowed(): Promise<void> {
  try {
    if (await isNativeApp()) set({ allowed: (await (await plugin()).native.canNotify()).allowed });
  } catch {
    // Leave unknown.
  }
}

let started: Promise<void> | null = null;

function start(): Promise<void> {
  started ??= (async () => {
    set({ settings: await store.load(), loaded: true });
    await commute.init();
    commute.subscribe(() => void push());
    await push();
    await refreshAllowed();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refreshAllowed();
    });
  })();
  return started;
}

export const notifications = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  start,
  async update(patch: Partial<NotificationSettings>) {
    const settings = { ...state.settings, ...patch };
    set({ settings });
    await store.save(settings);
    await push();
  },
  /** Asks Android for permission to show notifications (Android 13 and later). */
  async requestPermission() {
    try {
      await (await plugin()).native.requestPermissions({ permissions: ['notifications'] });
    } catch {
      // Denied or unsupported: refreshAllowed reports the truth.
    }
    await refreshAllowed();
  },
  async sendTest() {
    await (await plugin()).native.sendTest();
  },
};

export function useNotifications(): NotificationsState {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(notifications.subscribe, notifications.getState, () => INITIAL);
}

/** Mounted once in the layout so reminders are scheduled from the first launch, whichever tab opens. */
export function RemindersSync() {
  useEffect(() => {
    void start();
  }, []);
  return null;
}
