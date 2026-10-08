'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { KeyValueStore } from '../storage/kv';
import { nativeTracker } from '../tracking/nativeTracker';
import { createPlacesStore } from '../trips/places';
import { createTripRepository } from '../trips/repository';
import { CommuteState, INITIAL_COMMUTE_STATE, createCommuteController } from './controller';
import { DEV_TOOLS, isDevBuild } from '../devtools';
import { ProBilling, nativeBilling } from './billing';
import { createProStore } from './pro';
import { createTrialStore } from './trial';

/** Capacitor Preferences, imported lazily so the static build never loads native code. */
const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

/**
 * In a debug build, Google Play isn't consulted: `status` fails (so the Developer Preview switch's value stands)
 * and `purchase` unlocks Pro locally. Release builds pass straight through to Google Play.
 */
function withDevBypass(billing: ProBilling): ProBilling {
  return {
    status: async () => {
      if (await isDevBuild()) throw new Error('Debug build: purchases are simulated.');
      return billing.status();
    },
    purchase: async () => ((await isDevBuild()) ? 'purchased' : billing.purchase()),
    onUpdated: (callback) => billing.onUpdated(callback),
  };
}

/** One controller for the whole app, outside any page, so it survives tab switches. */
export const commute = createCommuteController({
  tracker: nativeTracker,
  trips: createTripRepository(preferences),
  places: createPlacesStore(preferences),
  pro: createProStore(preferences),
  trial: createTrialStore(preferences),
  // Demo builds use the Developer Preview switch instead of real purchases. Debug builds do the same:
  // they are checked at run time, so the real billing client is wrapped and stands down there.
  billing: DEV_TOOLS ? null : withDevBypass(nativeBilling),
});

if (typeof document !== 'undefined') {
  // The widget or notification may have started or stopped a trip, or permissions may have changed,
  // while the app was in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void commute.refresh();
    void nativeTracker.refreshWidget();
  });
}

export function useCommute(): CommuteState {
  useEffect(() => {
    void commute.init();
  }, []);
  return useSyncExternalStore(commute.subscribe, commute.getState, () => INITIAL_COMMUTE_STATE);
}
