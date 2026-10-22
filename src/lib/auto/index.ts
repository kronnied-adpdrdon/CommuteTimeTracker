'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { commute } from '../commute';
import { isNativeApp, lazyPlugin } from '../native';
import { KeyValueStore } from '../storage/kv';
import { AutoSettings, DEFAULT_AUTO_SETTINGS, createAutoSettingsStore } from './settings';

export type AutoPlace = 'home' | 'office';
export type AutoEvent = 'exit' | 'enter' | 'check';

/** What the rules decided for one crossing. Mirrors `AutoLogic.Result` on Android. */
export interface AutoDecision {
  action: 'NONE' | 'START' | 'KEEP' | 'DROP';
  reason: string;
  startedAt?: number;
  endedAt?: number;
  direction?: 'work' | 'home';
  /** While a candidate is waiting: when it gives up. */
  expiresAt?: number;
}

interface PermissionStatus {
  /** "Allow all the time" (precise location, plus background location on Android 10+). */
  background: boolean;
  /** Google Play services is present, so the phone can watch Home and Office. */
  supported: boolean;
  /** Location and Google Location Accuracy are on. Without them the phone never reports leaving or arriving. */
  accuracy: boolean;
}

interface AutoTrackingPlugin {
  configure(config: Record<string, unknown>): Promise<void>;
  checkBackground(): Promise<PermissionStatus>;
  requestBackground(): Promise<PermissionStatus>;
  fixAccuracy(): Promise<PermissionStatus>;
  returnWhenChanged(options: { kind: 'background' | 'battery' }): Promise<void>;
  /** Location or Location Accuracy was switched on or off while the app was away (or behind Google's dialog). */
  addListener(event: 'statusChanged', cb: (status: PermissionStatus) => void): Promise<unknown>;
  simulate(options: { event: AutoEvent; place?: AutoPlace; at?: number }): Promise<AutoDecision>;
}

const plugin = lazyPlugin<AutoTrackingPlugin>('AutoTracking');

const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

const store = createAutoSettingsStore(preferences);

export interface AutoState {
  settings: AutoSettings;
  loaded: boolean;
  /** Null until checked, or in a browser. */
  background: boolean | null;
  supported: boolean | null;
  accuracy: boolean | null;
}

const INITIAL: AutoState = { settings: DEFAULT_AUTO_SETTINGS, loaded: false, background: null, supported: null, accuracy: null };

/** Why automatic start and stop is switched on but can't work right now, or null if nothing is wrong (or not known yet). */
export function pausedReason(auto: AutoState): 'permission' | 'accuracy' | null {
  if (!auto.settings.enabled) return null;
  if (auto.background === false) return 'permission';
  if (auto.accuracy === false) return 'accuracy';
  return null;
}

let state = INITIAL;
const listeners = new Set<() => void>();
const set = (patch: Partial<AutoState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

let lastPushed = '';

/** Tells the Android side the user's choices and where Home and Office are (points only, no addresses). */
async function push(): Promise<void> {
  const app = commute.getState();
  if (!state.loaded || app.phase === 'loading' || !(await isNativeApp())) return;
  const point = (p?: { lat: number; lng: number }) => (p ? { lat: p.lat, lng: p.lng } : null);
  const config = { ...state.settings, home: point(app.places.home), office: point(app.places.office) };
  const key = JSON.stringify(config);
  if (key === lastPushed) return;
  lastPushed = key;
  try {
    await (await plugin()).native.configure(config);
  } catch {
    lastPushed = '';
  }
}

/** Re-reads the permission, which the user can change in phone settings at any time. */
async function refreshPermission(): Promise<void> {
  try {
    if (await isNativeApp()) set(await (await plugin()).native.checkBackground());
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
    await refreshPermission();
    if (await isNativeApp()) await (await plugin()).native.addListener('statusChanged', (status) => set(status));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refreshPermission();
    });
  })();
  return started;
}

export const autoTracking = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  start,
  async update(patch: Partial<AutoSettings>) {
    const settings = { ...state.settings, ...patch };
    set({ settings });
    await store.save(settings);
    await push();
  },
  /**
   * After the in-app explanation: asks Android for "Allow all the time", and turns automatic start and stop
   * on only if it was granted. Returns whether it is now on.
   */
  async enable(): Promise<boolean> {
    try {
      const status = await (await plugin()).native.requestBackground();
      set(status);
      if (!status.background || !status.supported) return false;
      await autoTracking.update({ enabled: true });
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Call just before sending the user to a phone settings page: MYCE comes back by itself as soon as "Allow all the
   * time" (background) or "Unrestricted" (battery) is set, where Android allows it. Otherwise Back still works.
   */
  async returnWhenChanged(kind: 'background' | 'battery'): Promise<void> {
    try {
      if (await isNativeApp()) await (await plugin()).native.returnWhenChanged({ kind });
    } catch {
      // Only a convenience.
    }
  },
  /** Turns on location and Google Location Accuracy: Google's one-tap dialog, or the phone's location settings. */
  async fixAccuracy(): Promise<void> {
    try {
      set(await (await plugin()).native.fixAccuracy());
    } catch {
      // Re-checked when the user comes back to the app.
    }
  },
  /** Developer tools: a pretend Home / Office crossing, run through the real rules on the phone. */
  async simulate(event: AutoEvent, place?: AutoPlace, at?: number): Promise<AutoDecision> {
    await start();
    return (await plugin()).native.simulate({ event, place, at });
  },
};

export function useAutoTracking(): AutoState {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(autoTracking.subscribe, autoTracking.getState, () => INITIAL);
}

/** Mounted once in the layout so the phone has the current settings from the first launch. */
export function AutoTrackingSync() {
  useEffect(() => {
    void start();
  }, []);
  return null;
}
