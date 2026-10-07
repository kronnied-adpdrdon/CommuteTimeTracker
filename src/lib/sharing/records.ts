import { LatLng } from '../tracking/geo';
import { isSampleTrip } from '../trips/sample';
import { Trip } from '../trips/types';

/** Trips older than this aren't shared. Must stay inside the server's limit (90 days). */
export const SHARE_WINDOW_DAYS = 60;
/** Upserts and deletions per upload. Must not exceed the server's limit (100). */
export const MAX_BATCH = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One trip as shared with "Share commute times". Deliberately coarse: the day and a 15-minute start slot (phone's
 * local time), rounded distance, and roughly 5 km squares for where it began and ended. Never exact places,
 * addresses, the route or anything about the person. Must match `functions/src/trips.ts`.
 */
export interface SharedTrip {
  /** The trip's random id, so an edit replaces the earlier copy and a deletion removes it. */
  tripId: string;
  /** Local date the trip started, YYYY-MM-DD. */
  date: string;
  /** Local start time, rounded down to 15 minutes, in minutes after midnight. */
  startSlot: number;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  durationSeconds: number;
  /** Kilometres, one decimal. */
  distanceKm: number;
  direction: 'work' | 'home' | 'other';
  auto: boolean;
  edited: boolean;
  /** Geohash, 5 characters (about 4.9 km × 4.9 km). Null when the trip has no saved start or end. */
  fromCell: string | null;
  toCell: string | null;
}

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Standard geohash. Precision 5 is a cell about 4.9 km across, the size of a neighbourhood. */
export function geohash({ lat, lng }: LatLng, precision = 5): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = '';
  let bits = 0, bit = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { bits = (bits << 1) | 1; lngMin = mid; } else { bits <<= 1; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { bits = (bits << 1) | 1; latMin = mid; } else { bits <<= 1; latMax = mid; }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toSharedTrip(trip: Trip): SharedTrip {
  const start = new Date(trip.startedAt);
  const minutes = start.getHours() * 60 + start.getMinutes();
  return {
    tripId: trip.id,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startSlot: minutes - (minutes % 15),
    weekday: start.getDay(),
    durationSeconds: Math.round(trip.durationSeconds),
    distanceKm: Math.round(trip.distanceMeters / 100) / 10,
    direction: trip.direction === 'unknown' ? 'other' : trip.direction,
    auto: trip.auto === true,
    edited: trip.original !== undefined,
    fromCell: trip.start ? geohash(trip.start) : null,
    toCell: trip.end ? geohash(trip.end) : null,
  };
}

/** Real trips that started after sharing was turned on, within the sharing window. Sample trips never leave the phone. */
export function isShareable(trip: Trip, since: number, now: number): boolean {
  return !isSampleTrip(trip) && trip.startedAt >= since && trip.startedAt >= now - SHARE_WINDOW_DAYS * DAY_MS && trip.startedAt <= now;
}

/** What was last sent for each trip, as a fingerprint of its shared record. */
export type SentLog = Record<string, string>;

export const fingerprint = (record: SharedTrip) => JSON.stringify(record);

export interface SyncPlan {
  upserts: SharedTrip[];
  /** Trips sent earlier and since deleted from the phone. */
  deletions: string[];
}

/**
 * What to send: new or changed trips, and deletions of sent trips that are gone from the phone. A trip that only
 * ages out of the window is left alone (its copy stays). At most `MAX_BATCH` items; the rest go next time.
 */
export function planSync(trips: Trip[], sent: SentLog, since: number, now: number): SyncPlan {
  const present = new Set(trips.map((t) => t.id));
  const deletions = Object.keys(sent).filter((id) => !present.has(id)).slice(0, MAX_BATCH);
  const upserts = trips
    .filter((trip) => isShareable(trip, since, now))
    .map(toSharedTrip)
    .filter((record) => sent[record.tripId] !== fingerprint(record))
    .slice(0, MAX_BATCH - deletions.length);
  return { upserts, deletions };
}

/** The log after the server accepted a plan. */
export function applySent(sent: SentLog, plan: SyncPlan): SentLog {
  const next = { ...sent };
  for (const id of plan.deletions) delete next[id];
  for (const record of plan.upserts) next[record.tripId] = fingerprint(record);
  return next;
}
