import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { TRIPS_KEY, createTripRepository } from './repository';
import { Trip } from './types';

const trip = (id: string, startedAt: number, distanceMeters = 1000): Trip => ({
  id,
  startedAt,
  endedAt: startedAt + 60_000,
  durationSeconds: 60,
  distanceMeters,
  direction: 'unknown',
});

describe('TripRepository', () => {
  it('starts empty', async () => {
    expect(await createTripRepository(createMemoryStore()).list()).toEqual([]);
  });

  it('saves and lists trips newest first', async () => {
    const repo = createTripRepository(createMemoryStore());
    await repo.save(trip('a', 100));
    await repo.save(trip('b', 300));
    await repo.save(trip('c', 200));
    expect((await repo.list()).map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('saving the same id replaces instead of duplicating', async () => {
    const repo = createTripRepository(createMemoryStore());
    await repo.save(trip('a', 100, 1000));
    await repo.save(trip('a', 100, 2500));
    const trips = await repo.list();
    expect(trips).toHaveLength(1);
    expect(trips[0].distanceMeters).toBe(2500);
  });

  it('removes a trip', async () => {
    const repo = createTripRepository(createMemoryStore());
    await repo.save(trip('a', 100));
    await repo.save(trip('b', 200));
    await repo.remove('a');
    expect((await repo.list()).map((t) => t.id)).toEqual(['b']);
  });

  it('survives a restart: a new repository over the same storage sees the trips', async () => {
    const store = createMemoryStore();
    await createTripRepository(store).save(trip('a', 100));
    expect(await createTripRepository(store).list()).toHaveLength(1);
  });

  it('saves fired at the same moment are not lost', async () => {
    const repo = createTripRepository(createMemoryStore());
    await Promise.all(Array.from({ length: 20 }, (_, i) => repo.save(trip(String(i), i))));
    expect(await repo.list()).toHaveLength(20);
  });

  it('keeps a copy of unreadable data instead of overwriting it', async () => {
    const store = createMemoryStore({ [TRIPS_KEY]: '{not json' });
    const repo = createTripRepository(store, () => 42);
    expect(await repo.list()).toEqual([]);
    await repo.save(trip('new', 1));
    expect(store.dump()[`${TRIPS_KEY}.corrupt.42`]).toBe('{not json');
    expect(await repo.list()).toHaveLength(1);
  });

  it('clear removes every trip', async () => {
    const repo = createTripRepository(createMemoryStore());
    await repo.save(trip('a', 100));
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it('replaceAll swaps in a new list', async () => {
    const repo = createTripRepository(createMemoryStore());
    await repo.save(trip('a', 100));
    await repo.replaceAll([trip('b', 200), trip('c', 300)]);
    expect((await repo.list()).map((t) => t.id)).toEqual(['c', 'b']);
  });
});
