import { KeyValueStore, createSerialQueue, quarantine } from '../storage/kv';
import { Trip } from './types';

export const TRIPS_KEY = 'trips.v1';

interface TripsFile {
  version: 1;
  trips: Trip[];
}

export interface TripRepository {
  /** All saved trips, newest first. */
  list(): Promise<Trip[]>;
  /** Adds a trip, or replaces the saved trip with the same id. */
  save(trip: Trip): Promise<void>;
  remove(id: string): Promise<void>;
  /** Replaces every saved trip, e.g. after re-tagging them all. */
  replaceAll(trips: Trip[]): Promise<void>;
  clear(): Promise<void>;
}

export function createTripRepository(store: KeyValueStore, now: () => number = Date.now): TripRepository {
  const enqueue = createSerialQueue();

  async function read(): Promise<Trip[]> {
    const raw = await store.get(TRIPS_KEY);
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw) as TripsFile;
      if (parsed?.version === 1 && Array.isArray(parsed.trips)) return parsed.trips;
    } catch {
      // Fall through to quarantine.
    }
    await quarantine(store, TRIPS_KEY, raw, now());
    return [];
  }

  const write = (trips: Trip[]) => store.set(TRIPS_KEY, JSON.stringify({ version: 1, trips } satisfies TripsFile));

  return {
    list: () => enqueue(async () => (await read()).sort((a, b) => b.startedAt - a.startedAt)),
    save: (trip) =>
      enqueue(async () => {
        const others = (await read()).filter((t) => t.id !== trip.id);
        await write([...others, trip]);
      }),
    remove: (id) =>
      enqueue(async () => {
        const trips = await read();
        const remaining = trips.filter((t) => t.id !== id);
        if (remaining.length !== trips.length) await write(remaining);
      }),
    replaceAll: (trips) => enqueue(() => write(trips)),
    clear: () => enqueue(() => store.remove(TRIPS_KEY)),
  };
}
