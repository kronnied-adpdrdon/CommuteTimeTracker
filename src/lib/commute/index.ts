'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { KeyValueStore } from '../storage/kv';
import { nativeTracker } from '../tracking/nativeTracker';
import { createPlacesStore } from '../trips/places';
import { createTripRepository } from '../trips/repository';
import { CommuteState, INITIAL_COMMUTE_STATE, createCommuteController } from './controller';
import { createProStore } from './pro';

/** Capacitor Preferences, imported lazily so the static build never loads native code. */
const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

/** One controller for the whole app, outside any page, so it survives tab switches. */
export const commute = createCommuteController({
  tracker: nativeTracker,
  trips: createTripRepository(preferences),
  places: createPlacesStore(preferences),
  pro: createProStore(preferences),
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
