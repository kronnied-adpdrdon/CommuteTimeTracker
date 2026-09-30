import { Preferences } from '@capacitor/preferences';
import { KeyValueStore } from './kv';

/** On Android this is SharedPreferences; in a desktop browser (`next dev`) it falls back to localStorage. */
export const preferencesStore: KeyValueStore = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};
