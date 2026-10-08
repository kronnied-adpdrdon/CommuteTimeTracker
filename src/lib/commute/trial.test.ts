import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { Trip } from '../trips/types';
import { TRIAL_KEY, createTrialStore, inTrial, proUnlocked, trialDaysLeft, trialEnd, trialStart } from './trial';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 8, 12);
const trip = (id: string, startedAt: number): Trip => ({ id, startedAt, endedAt: startedAt + 1, durationSeconds: 1, distanceMeters: 1, direction: 'work' });

describe('trialStart', () => {
  it('starts on first launch', () => {
    expect(trialStart(null, [], NOW)).toBe(NOW);
  });

  it('keeps the saved start', () => {
    expect(trialStart(NOW - 5 * DAY, [], NOW)).toBe(NOW - 5 * DAY);
  });

  it('counts from the oldest real trip if that is earlier, so clearing the setting cannot restart it', () => {
    expect(trialStart(null, [trip('a', NOW - 40 * DAY), trip('b', NOW - DAY)], NOW)).toBe(NOW - 40 * DAY);
    expect(trialStart(null, [trip('sample-20260801-1', NOW - 90 * DAY)], NOW)).toBe(NOW);
  });
});

describe('unlocking', () => {
  const endsAt = trialEnd(NOW - 10 * DAY);

  it('opens everything in Pro for 30 days, then only if bought', () => {
    expect(proUnlocked({ isPro: false, trialEndsAt: endsAt }, NOW)).toBe(true);
    expect(proUnlocked({ isPro: false, trialEndsAt: endsAt }, endsAt)).toBe(false);
    expect(proUnlocked({ isPro: true, trialEndsAt: endsAt }, endsAt + 99 * DAY)).toBe(true);
    expect(proUnlocked({ isPro: false, trialEndsAt: null }, NOW)).toBe(false);
  });

  it('counts the days left, including today', () => {
    expect(trialDaysLeft(endsAt, NOW)).toBe(20);
    expect(trialDaysLeft(endsAt, endsAt - 1)).toBe(1);
    expect(trialDaysLeft(endsAt, endsAt + DAY)).toBe(0);
  });

  it('shows the countdown only to people who have not bought', () => {
    expect(inTrial({ isPro: false, trialEndsAt: endsAt }, NOW)).toBe(true);
    expect(inTrial({ isPro: true, trialEndsAt: endsAt }, NOW)).toBe(false);
  });
});

describe('createTrialStore', () => {
  it('saves and reads the start, ignoring junk', async () => {
    const memory = createMemoryStore({ [TRIAL_KEY]: 'nonsense' });
    const store = createTrialStore(memory);
    expect(await store.load()).toBeNull();
    await store.save(NOW);
    expect(await store.load()).toBe(NOW);
  });
});
