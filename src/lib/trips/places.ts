import { KeyValueStore } from '../storage/kv';
import { SavedPlaces } from './direction';

export const PLACES_KEY = 'places.v1';

export interface PlacesStore {
  load(): Promise<SavedPlaces>;
  save(places: SavedPlaces): Promise<void>;
}

export function createPlacesStore(store: KeyValueStore): PlacesStore {
  return {
    async load() {
      const raw = await store.get(PLACES_KEY);
      if (raw === null) return {};
      try {
        const parsed = JSON.parse(raw) as SavedPlaces;
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    },
    save: (places) => store.set(PLACES_KEY, JSON.stringify(places)),
  };
}
