import { isNativeApp, lazyPlugin } from './native';
import { KeyValueStore } from './storage/kv';
import { isSampleTrip } from './trips/sample';
import { Trip } from './trips/types';

export const REVIEW_KEY = 'review.v1';
/** Google's rating card is offered once, this long after first use, so people rate an app they've lived with. */
export const REVIEW_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

interface ReviewPlugin {
  requestReview(): Promise<void>;
  openStorePage(): Promise<void>;
}

const plugin = lazyPlugin<ReviewPlugin>('Support');

/** Time to offer the rating card: not offered before, a week since first use, and at least one real trip saved. */
export function shouldAskForReview({ asked, firstUseAt, trips, now }: { asked: boolean; firstUseAt: number | null; trips: Trip[]; now: number }): boolean {
  if (asked || firstUseAt === null) return false;
  if (now - firstUseAt < REVIEW_AFTER_DAYS * DAY_MS) return false;
  return trips.some((t) => !isSampleTrip(t));
}

let asking = false;

/**
 * Offers Google Play's rating card once, when `shouldAskForReview` says so. It is marked as offered before
 * showing, so a crash or a closed app never brings it back. Google may still decide not to show it.
 */
export async function maybeAskForReview(store: KeyValueStore, state: { firstUseAt: number | null; trips: Trip[] }, now: number): Promise<void> {
  if (asking) return;
  asking = true;
  try {
    if (!(await isNativeApp())) return;
    const asked = (await store.get(REVIEW_KEY)) !== null;
    if (!shouldAskForReview({ asked, ...state, now })) return;
    await store.set(REVIEW_KEY, String(now));
    await (await plugin()).native.requestReview();
  } catch {
    // Rating is optional: never let it break Home.
  } finally {
    asking = false;
  }
}

/** "Rate MYCE" in Settings: MYCE's page in the Play Store. Returns false if it couldn't be opened. */
export async function openStorePage(): Promise<boolean> {
  try {
    if (!(await isNativeApp())) return false;
    await (await plugin()).native.openStorePage();
    return true;
  } catch {
    return false;
  }
}
