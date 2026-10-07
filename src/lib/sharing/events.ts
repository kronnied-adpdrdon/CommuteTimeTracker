import { isSampleTrip } from '../trips/sample';
import { Trip } from '../trips/types';

/**
 * App-usage events, sent only with "Share how you use the app" on. Names and labels only: never times,
 * distances, places or anything typed. Event names follow Firebase rules (letters, digits, underscores).
 */
export type UsageEvent =
  | { name: 'setup_step'; params: { step: string; action: 'next' | 'skip' } }
  | { name: 'setup_complete'; params?: undefined }
  | { name: 'recording_choice'; params: { choice: 'auto' | 'manual' } }
  | { name: 'auto_tracking'; params: { enabled: boolean } }
  | { name: 'reminder_setting'; params: { reminder: string; enabled: boolean } }
  | { name: 'trip_saved'; params: { auto: boolean; direction: string } }
  | { name: 'trip_edited'; params?: undefined }
  | { name: 'trip_deleted'; params: { count: number } }
  | { name: 'upgrade_tap'; params: { from: string } }
  | { name: 'pro_purchased'; params?: undefined }
  | { name: 'commute_sharing'; params: { enabled: boolean } };

/** What changed in the saved trips, as usage events. Sample trips from Developer tools don't count. */
export function tripEvents(before: Trip[], after: Trip[]): UsageEvent[] {
  const real = (trips: Trip[]) => new Map(trips.filter((t) => !isSampleTrip(t)).map((t) => [t.id, t]));
  const was = real(before);
  const now = real(after);
  const events: UsageEvent[] = [];
  for (const [id, trip] of now) {
    const old = was.get(id);
    if (!old) events.push({ name: 'trip_saved', params: { auto: trip.auto === true, direction: trip.direction } });
    // Not on a direction change alone: changing Home or Office re-labels trips without anyone editing them.
    else if (trip.original && (!old.original || old.startedAt !== trip.startedAt || old.endedAt !== trip.endedAt || old.distanceMeters !== trip.distanceMeters)) {
      events.push({ name: 'trip_edited' });
    }
  }
  const removed = [...was.keys()].filter((id) => !now.has(id)).length;
  if (removed > 0) events.push({ name: 'trip_deleted', params: { count: removed } });
  return events;
}
