import { KeyValueStore } from '../storage/kv';
import { SavedPlaces } from './direction';

export const PLACES_KEY = 'places.v1';

/**
 * The "Don't ask me again" choice. Version 1.0 stored its "Maybe later" button under `placesPromptDismissed.v1`,
 * which meant something different, so that old key is deliberately ignored: phones that had it would
 * otherwise never see the pop-up.
 */
export const PLACES_PROMPT_NEVER_ASK_KEY = 'placesPromptNeverAsk.v2';

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
    isNeverAsk: async () => (await store.get(PLACES_PROMPT_NEVER_ASK_KEY)) === 'true',
    setNeverAsk: (neverAsk) => (neverAsk ? store.set(PLACES_PROMPT_NEVER_ASK_KEY, 'true') : store.remove(PLACES_PROMPT_NEVER_ASK_KEY)),
  };
}
