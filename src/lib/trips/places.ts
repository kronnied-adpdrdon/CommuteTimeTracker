import { KeyValueStore } from '../storage/kv';
import { SavedPlaces } from './direction';

export const PLACES_KEY = 'places.v1';

/** Kept under its original name so anyone who already chose "don't ask" keeps that choice. */
export const PLACES_PROMPT_DISMISSED_KEY = 'placesPromptDismissed.v1';

export interface PlacesStore {
  load(): Promise<SavedPlaces>;
  save(places: SavedPlaces): Promise<void>;
  /** Whether the user ticked "Don't ask again" on the Home/Office pop-up. */
  isNeverAsk(): Promise<boolean>;
  setNeverAsk(neverAsk: boolean): Promise<void>;
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
    isNeverAsk: async () => (await store.get(PLACES_PROMPT_DISMISSED_KEY)) === 'true',
    setNeverAsk: (neverAsk) => (neverAsk ? store.set(PLACES_PROMPT_DISMISSED_KEY, 'true') : store.remove(PLACES_PROMPT_DISMISSED_KEY)),
  };
}
