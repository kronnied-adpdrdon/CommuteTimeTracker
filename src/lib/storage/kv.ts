/** Minimal async key-value storage. The app uses Capacitor Preferences; tests use the in-memory version. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface MemoryStore extends KeyValueStore {
  /** A copy of everything stored, for tests. */
  dump(): Record<string, string>;
}

export function createMemoryStore(initial: Record<string, string> = {}): MemoryStore {
  const data = new Map(Object.entries(initial));
  return {
    async get(key) {
      return data.get(key) ?? null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data);
    },
  };
}

/**
 * Runs async tasks one at a time, in the order they were queued, so read-modify-write
 * operations can't overwrite each other. A failed task doesn't block the ones after it.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}

/**
 * Moves an unreadable value aside instead of letting the next save overwrite it,
 * so the data is still there if it can be repaired later.
 */
export async function quarantine(store: KeyValueStore, key: string, raw: string, now: number): Promise<void> {
  await store.set(`${key}.corrupt.${now}`, raw);
  await store.remove(key);
}
