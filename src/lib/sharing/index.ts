'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { autoTracking } from '../auto';
import { commute } from '../commute';
import { isNativeApp, lazyPlugin } from '../native';
import { notifications } from '../notifications';
import { NotificationSettings } from '../notifications/settings';
import { KeyValueStore } from '../storage/kv';
import { logToDiagnostics } from '../support';
import { Trip } from '../trips/types';
import { UsageEvent, tripEvents } from './events';
import { applySent, planSync } from './records';
import { DEFAULT_SHARING_SETTINGS, SharingSettings, createSharingSettingsStore } from './settings';
import { createSharingClient } from './upload';

interface SharingPlugin {
  setUsageEnabled(options: { enabled: boolean }): Promise<void>;
  logEvent(options: { name: string; params: Record<string, string | number | boolean> }): Promise<void>;
  appCheckToken(): Promise<{ token: string }>;
}

const plugin = lazyPlugin<SharingPlugin>('Sharing');

const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

const store = createSharingSettingsStore(preferences);

const client = createSharingClient({
  fetch: (input, init) => fetch(input, init),
  appCheckToken: async () => (await (await plugin()).native.appCheckToken()).token,
});

export interface SharingState {
  settings: SharingSettings;
  loaded: boolean;
}

const INITIAL: SharingState = { settings: DEFAULT_SHARING_SETTINGS, loaded: false };

let state = INITIAL;
const listeners = new Set<() => void>();
const set = (patch: Partial<SharingState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

async function save(patch: Partial<SharingSettings>): Promise<void> {
  const settings = { ...state.settings, ...patch };
  set({ settings });
  await store.save(settings);
}

/** Records an app-usage event. Does nothing unless "Share how you use the app" is on. */
export function track(event: UsageEvent): void {
  if (state.settings.usage !== true) return;
  void (async () => {
    try {
      if (await isNativeApp()) await (await plugin()).native.logEvent({ name: event.name, params: event.params ?? {} });
    } catch {
      // Statistics must never get in the way.
    }
  })();
}

async function applyUsage(enabled: boolean): Promise<void> {
  try {
    if (await isNativeApp()) await (await plugin()).native.setUsageEnabled({ enabled });
  } catch {
    // Builds without Firebase: nothing to switch.
  }
}

let appVersion: string | null = null;

async function version(): Promise<string> {
  if (appVersion) return appVersion;
  try {
    const { App } = await import('@capacitor/app');
    appVersion = (await App.getInfo()).version;
  } catch {
    appVersion = 'unknown';
  }
  return appVersion;
}

let syncing = false;
let syncAgain = false;

/**
 * Finishes any deletion still waiting, then sends new, changed and deleted trips, a batch at a time. Nothing new
 * goes up while a deletion is outstanding. Anything that fails waits for the next try.
 */
async function sync(): Promise<void> {
  if (syncing) {
    syncAgain = true;
    return;
  }
  if (state.settings.pendingDelete) {
    await flushDeletion();
    if (state.settings.pendingDelete) return;
  }
  const { commute: on, installId, commuteSince } = state.settings;
  if (on !== true || !installId || commuteSince === null || commute.getState().phase === 'loading' || !(await isNativeApp())) return;
  syncing = true;
  try {
    for (let round = 0; round < 5; round++) {
      const plan = planSync(commute.getState().trips, state.settings.sent, commuteSince, Date.now());
      if (plan.upserts.length === 0 && plan.deletions.length === 0) break;
      await client.upload(installId, await version(), plan);
      // Sharing turned off (and the ID deleted) meanwhile: don't log under a new ID.
      if (state.settings.installId !== installId) break;
      await save({ sent: applySent(state.settings.sent, plan) });
    }
  } catch (error) {
    void logToDiagnostics(`Sharing: upload failed (${error instanceof Error ? error.message : 'unknown'}), will retry`);
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      void sync();
    }
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Waits a little after a change, so a trip edited straight after saving goes up once. */
function syncSoon(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void sync(), 5000);
}

const REMINDERS: (keyof NotificationSettings)[] = ['leaveNow', 'evening', 'weekly', 'monthly', 'slowDay'];

/** Watches the rest of the app for usage events, and for trips to send. */
function watch(): void {
  const loaded = commute.getState().phase !== 'loading';
  let trips: Trip[] | null = loaded ? commute.getState().trips : null;
  let isPro: boolean | null = loaded ? commute.getState().isPro : null;
  commute.subscribe(() => {
    const app = commute.getState();
    if (app.phase === 'loading') return;
    if (trips !== app.trips) {
      if (trips !== null) {
        tripEvents(trips, app.trips).forEach(track);
        syncSoon();
      }
      trips = app.trips;
    }
    if (isPro === false && app.isPro) track({ name: 'pro_purchased' });
    isPro = app.isPro;
  });

  let autoOn: boolean | null = autoTracking.getState().loaded ? autoTracking.getState().settings.enabled : null;
  autoTracking.subscribe(() => {
    const auto = autoTracking.getState();
    if (!auto.loaded) return;
    if (autoOn !== null && autoOn !== auto.settings.enabled) track({ name: 'auto_tracking', params: { enabled: auto.settings.enabled } });
    autoOn = auto.settings.enabled;
  });

  let reminders: NotificationSettings | null = notifications.getState().loaded ? notifications.getState().settings : null;
  notifications.subscribe(() => {
    const now = notifications.getState();
    if (!now.loaded) return;
    if (reminders && reminders !== now.settings) {
      for (const key of REMINDERS) {
        if (reminders[key] !== now.settings[key]) track({ name: 'reminder_setting', params: { reminder: key, enabled: Boolean(now.settings[key]) } });
      }
    }
    reminders = now.settings;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sync();
  });
  window.addEventListener('online', () => void sync());
}

let started: Promise<void> | null = null;

function start(): Promise<void> {
  started ??= (async () => {
    const settings = await store.load();
    set({ settings, loaded: true });
    // Firebase remembers the choice too; this repairs it if the two ever disagree.
    if (settings.usage === true) await applyUsage(true);
    await Promise.all([commute.init(), autoTracking.start(), notifications.start()]);
    watch();
    await sync();
  })();
  return started;
}

/** Asks the server to delete everything shared under the pending ID. Quietly retried later if it fails. */
async function flushDeletion(): Promise<void> {
  const id = state.settings.pendingDelete;
  if (!id || !(await isNativeApp())) return;
  try {
    await client.deleteAll(id);
    if (state.settings.pendingDelete === id) await save({ pendingDelete: null });
  } catch (error) {
    void logToDiagnostics(`Sharing: deletion request failed (${error instanceof Error ? error.message : 'unknown'}), will retry`);
  }
}

/**
 * Turning commute sharing off withdraws consent, so everything shared is deleted too (India's DPDP Act requires
 * erasure on withdrawal). Turning it on again starts afresh with a new random ID.
 */
async function setCommute(on: boolean): Promise<void> {
  if (on === (state.settings.commute === true)) {
    if (state.settings.commute === null) await save({ commute: on });
    return;
  }
  if (on) {
    await save({ commute: true, commuteSince: Date.now(), installId: crypto.randomUUID(), sent: {} });
    track({ name: 'commute_sharing', params: { enabled: true } });
    void sync();
  } else {
    track({ name: 'commute_sharing', params: { enabled: false } });
    // Nothing reached the server if nothing was ever confirmed sent.
    const shared = Object.keys(state.settings.sent).length > 0 ? state.settings.installId : null;
    await save({ commute: false, commuteSince: null, installId: null, sent: {}, pendingDelete: shared ?? state.settings.pendingDelete });
    await flushDeletion();
  }
}

async function setUsage(on: boolean): Promise<void> {
  if (on === state.settings.usage) return;
  await save({ usage: on });
  await applyUsage(on);
}

export const sharing = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  start,
  setUsage,
  setCommute,
  /** The setup's "Help improve MYCE" screen: both answers at once. */
  async answer(choices: { usage: boolean; commute: boolean }) {
    await setUsage(choices.usage);
    await setCommute(choices.commute);
  },
  sync,
};

export function useSharing(): SharingState {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(sharing.subscribe, sharing.getState, () => INITIAL);
}

/** Mounted once in the layout, so trips are sent and events counted whichever tab opens first. */
export function SharingSync() {
  useEffect(() => {
    void start();
  }, []);
  return null;
}
