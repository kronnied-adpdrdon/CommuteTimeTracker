import { KeyValueStore } from '../storage/kv';
import { isSampleTrip } from '../trips/sample';
import { Trip } from '../trips/types';

export const TRIAL_KEY = 'trial.v1';
/** Every new user gets everything in Pro free for their first 30 days; buying any time keeps it. */
export const TRIAL_DAYS = 30;
/** Shown when Google Play hasn't said the price yet (no connection, or the product isn't live). */
export const PRO_PRICE_FALLBACK = '₹100';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the free month began: first launch, or the oldest real trip if that's earlier (so clearing one setting can't
 * restart it). Android backup restores both with the app's data on a reinstall.
 */
export function trialStart(stored: number | null, trips: Trip[], now: number): number {
  const oldestTrip = trips.filter((t) => !isSampleTrip(t)).reduce((min, t) => Math.min(min, t.startedAt), Infinity);
  return Math.min(stored ?? now, oldestTrip, now);
}

export const trialEnd = (start: number) => start + TRIAL_DAYS * DAY_MS;

/** Whole days left, counting today; 0 once it has ended. */
export function trialDaysLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

/** Pro features are open when Pro is bought, or during the free month. */
export function proUnlocked({ isPro, trialEndsAt }: { isPro: boolean; trialEndsAt: number | null }, now: number): boolean {
  return isPro || (trialEndsAt !== null && now < trialEndsAt);
}

/** In the free month and not bought: show the countdown. */
export function inTrial(state: { isPro: boolean; trialEndsAt: number | null }, now: number): boolean {
  return !state.isPro && state.trialEndsAt !== null && now < state.trialEndsAt;
}

export interface TrialStore {
  load(): Promise<number | null>;
  save(startedAt: number): Promise<void>;
}

export function createTrialStore(store: KeyValueStore): TrialStore {
  return {
    async load() {
      const value = Number(await store.get(TRIAL_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    },
    save: (startedAt) => store.set(TRIAL_KEY, String(Math.round(startedAt))),
  };
}
