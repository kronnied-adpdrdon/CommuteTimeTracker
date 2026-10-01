'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { KeyValueStore } from '../storage/kv';
import { capgoLocationSource } from '../tracking/locationSource';
import { createActiveTripStore } from '../trips/activeTrip';
import { createPlacesStore } from '../trips/places';
import { createTripRepository } from '../trips/repository';
import { CommuteState, INITIAL_COMMUTE_STATE, createCommuteController } from './controller';

/** Capacitor Preferences, imported lazily so the static build never loads native code. */
const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

/**
 * One controller for the whole app. It lives outside any page so tracking keeps going
 * while the user switches tabs.
 */
export const commute = createCommuteController({
  location: capgoLocationSource,
  trips: createTripRepository(preferences),
  activeTrip: createActiveTripStore(preferences),
  places: createPlacesStore(preferences),
});

export function useCommute(): CommuteState {
  useEffect(() => {
    void commute.init();
  }, []);
  return useSyncExternalStore(commute.subscribe, commute.getState, () => INITIAL_COMMUTE_STATE);
}
