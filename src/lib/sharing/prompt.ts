import { isSampleTrip } from '../trips/sample';
import { Trip } from '../trips/types';
import { SharingSettings } from './settings';

/** The commute-times question waits until the user has seen their own trips. */
export const PROMPT_AFTER_TRIPS = 3;

/**
 * When to show the one-time "Help map commute times" card on Home: never answered, and at least three real trips
 * saved. Returns the average of the latest three, for the card's opening line, or null when the card stays hidden.
 * Answering either way (or in Settings) hides it for good.
 */
export function commutePrompt(settings: SharingSettings, trips: Trip[]): { averageMinutes: number } | null {
  if (settings.commute !== null) return null;
  const latest = trips
    .filter((t) => !isSampleTrip(t))
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, PROMPT_AFTER_TRIPS);
  if (latest.length < PROMPT_AFTER_TRIPS) return null;
  const seconds = latest.reduce((sum, t) => sum + t.durationSeconds, 0) / latest.length;
  return { averageMinutes: Math.max(1, Math.round(seconds / 60)) };
}
