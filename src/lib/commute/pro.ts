import { KeyValueStore } from '../storage/kv';

export const PRO_KEY = 'pro.v1';

/**
 * Whether Pro is unlocked on this phone. For now only the demo-build preview switch sets it;
 * once Google Play billing is added, a verified purchase (or Restore) will.
 */
export interface ProStore {
  load(): Promise<boolean>;
  save(isPro: boolean): Promise<void>;
}

export function createProStore(store: KeyValueStore): ProStore {
  return {
    load: async () => (await store.get(PRO_KEY)) === 'true',
    save: (isPro) => (isPro ? store.set(PRO_KEY, 'true') : store.remove(PRO_KEY)),
  };
}
