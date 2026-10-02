import { LatLng } from '../tracking/geo';
import { SavedPlaces, tagDirection } from './direction';
import { Trip } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The end time for a trip from a clock time like "09:10", on the day the trip started.
 * A time at or before the start means the trip crossed midnight, so it lands on the next day.
 */
export function endTimeFromClock(startedAt: number, clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const start = new Date(startedAt);
  let end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hours, minutes).getTime();
  if (end <= startedAt) end += DAY_MS;
  return end;
}

/**
 * The trip with a corrected end time. Distance is left as recorded: the app can't know how far
 * you travelled in the time added or removed. Returns null for an end at or before the start,
 * or a trip over 24 hours.
 */
export function withEndTime(trip: Trip, endedAt: number): Trip | null {
  if (endedAt <= trip.startedAt || endedAt - trip.startedAt > DAY_MS) return null;
  return { ...trip, endedAt, durationSeconds: Math.round((endedAt - trip.startedAt) / 1000) };
}

/** Recomputes work/home for every trip, e.g. after Home or Office changes. */
export function retagTrips(trips: Trip[], places: SavedPlaces): Trip[] {
  return trips.map((trip) => ({ ...trip, direction: tagDirection(trip.start, trip.end, places) }));
}

export type PlaceKind = keyof SavedPlaces;

export function withPlace(places: SavedPlaces, kind: PlaceKind, where: LatLng | null, label?: string): SavedPlaces {
  const next = { ...places };
  if (where) next[kind] = label ? { lat: where.lat, lng: where.lng, label } : { lat: where.lat, lng: where.lng };
  else delete next[kind];
  return next;
}
