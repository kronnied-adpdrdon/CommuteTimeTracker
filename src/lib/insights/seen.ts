'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { KeyValueStore } from '../storage/kv';

/**
 * Which Wraps have been opened, as a JSON list of Wrap ids. The widget reads the same key (WidgetWrap.java) to
 * stop saying "Your Wrap is ready", so keep the name and format in step with it.
 */
export const WRAPS_SEEN_KEY = 'insights.wrapsSeen.v1';

export function parseSeen(raw: string | null): string[] {
  try {
    const list = JSON.parse(raw ?? '[]');
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function createSeenStore(store: KeyValueStore) {
  let seen: string[] | null = null;
  let loaded: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    load(): Promise<void> {
      loaded ??= (async () => {
        seen = parseSeen(await store.get(WRAPS_SEEN_KEY));
        emit();
      })().catch(() => {
        seen ??= [];
        emit();
      });
      return loaded;
    },
    get: () => seen,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async markSeen(id: string): Promise<void> {
      await this.load();
      const list = seen ?? [];
      if (list.includes(id)) return;
      seen = [...list, id];
      emit();
      await store.set(WRAPS_SEEN_KEY, JSON.stringify(seen));
    },
    /** Developer tools: every Wrap counts as unopened again. */
    async reset(): Promise<void> {
      await this.load();
      seen = [];
      emit();
      await store.remove(WRAPS_SEEN_KEY);
    },
  };
}

const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

export const wrapsSeen = createSeenStore(preferences);

/** Ids of the Wraps opened so far, or null until they're read (so a seen Wrap never flashes up as new). */
export function useWrapsSeen(): string[] | null {
  useEffect(() => {
    void wrapsSeen.load();
  }, []);
  return useSyncExternalStore(wrapsSeen.subscribe, wrapsSeen.get, () => null);
}
