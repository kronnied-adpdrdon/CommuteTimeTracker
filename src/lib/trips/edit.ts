import { LatLng } from '../tracking/geo';
import { SavedPlaces, tagDirection } from './direction';
import { formatTimeOfDay } from './format';
import { Trip, TripDirection } from './types';

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

/** A clock time like "07:50" on the same calendar day as `day`. */
export function startTimeFromClock(day: number, clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const d = new Date(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes).getTime();
}

const MAX_KM = 1000;

/**
 * Metres from a typed distance like "12.4" or "12,4" km. If the text still reads as the
 * current distance, the exact recorded metres are kept so an untouched field isn't an edit.
 */
export function distanceFromInput(text: string, currentMeters: number): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === (Math.max(0, currentMeters) / 1000).toFixed(1)) return currentMeters;
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(trimmed)) return null;
  const km = Number(trimmed);
  return km <= MAX_KM ? Math.round(km * 1000) : null;
}

/** The edit form's fields, as typed. */
export interface TripForm {
  startClock: string;
  endClock: string;
  distanceKm: string;
  direction: TripDirection;
}

export function tripForm(trip: Trip): TripForm {
  return {
    startClock: formatTimeOfDay(trip.startedAt),
    endClock: formatTimeOfDay(trip.endedAt),
    distanceKm: (Math.max(0, trip.distanceMeters) / 1000).toFixed(1),
    direction: trip.direction,
  };
}

export type EditProblem = 'bad-time' | 'too-long' | 'in-future' | 'overlap' | 'bad-distance';

interface ParsedForm {
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
}

/** The form only shows minutes, so a time the user didn't touch keeps its recorded seconds. */
function parseForm(trip: Trip, form: TripForm): ParsedForm | EditProblem {
  const startedAt =
    form.startClock === formatTimeOfDay(trip.startedAt) ? trip.startedAt : startTimeFromClock(trip.startedAt, form.startClock);
  const endedAt =
    startedAt === null
      ? null
      : form.endClock === formatTimeOfDay(trip.endedAt) && trip.endedAt > startedAt
        ? trip.endedAt
        : endTimeFromClock(startedAt, form.endClock);
  if (startedAt === null || endedAt === null) return 'bad-time';
  const distanceMeters = distanceFromInput(form.distanceKm, trip.distanceMeters);
  if (distanceMeters === null) return 'bad-distance';
  return { startedAt, endedAt, distanceMeters };
}

/**
 * The trip with the form's changes, or what's wrong with them. Distance is never recalculated
 * from the new times: the route isn't saved, so only the user can correct it. The first edit
 * stores the recorded values in `original`; a form with no changes returns the trip as it was.
 */
export function applyTripForm(trip: Trip, form: TripForm, others: Trip[], now: number): Trip | EditProblem {
  const parsed = parseForm(trip, form);
  if (typeof parsed === 'string') return parsed;
  const { startedAt, endedAt, distanceMeters } = parsed;
  if (endedAt - startedAt >= DAY_MS) return 'too-long';
  if (endedAt > now) return 'in-future';
  if (others.some((o) => o.id !== trip.id && startedAt < o.endedAt && endedAt > o.startedAt)) return 'overlap';

  const unchanged =
    startedAt === trip.startedAt && endedAt === trip.endedAt && distanceMeters === trip.distanceMeters && form.direction === trip.direction;
  if (unchanged) return trip;

  return {
    ...trip,
    startedAt,
    endedAt,
    durationSeconds: Math.round((endedAt - startedAt) / 1000),
    distanceMeters,
    direction: form.direction,
    original: trip.original ?? {
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      durationSeconds: trip.durationSeconds,
      distanceMeters: trip.distanceMeters,
      direction: trip.direction,
    },
    ...(trip.directionByUser || form.direction !== trip.direction ? { directionByUser: true } : {}),
  };
}

export const isEdited = (trip: Trip) => trip.original !== undefined;

/** Above this, the times or distance are almost certainly wrong. */
const FAST_KMH = 120;
/** Below this over a long trip, likewise (slower than walking). */
const SLOW_KMH = 2;
const SLOW_MIN_SECONDS = 15 * 60;

export interface SpeedWarning {
  kind: 'fast' | 'slow';
  kmh: number;
}

/** A gentle warning for the edit form when the times and distance don't fit together. Saving is still allowed. */
export function speedWarning(trip: Trip, form: TripForm): SpeedWarning | null {
  const parsed = parseForm(trip, form);
  if (typeof parsed === 'string') return null;
  const seconds = (parsed.endedAt - parsed.startedAt) / 1000;
  if (seconds <= 0) return null;
  const kmh = parsed.distanceMeters / 1000 / (seconds / 3600);
  if (kmh > FAST_KMH) return { kind: 'fast', kmh: Math.round(kmh) };
  if (kmh < SLOW_KMH && seconds >= SLOW_MIN_SECONDS) return { kind: 'slow', kmh: Math.round(kmh * 10) / 10 };
  return null;
}

/**
 * Recomputes work/home for every trip, e.g. after Home or Office changes. Kept as they are: a direction
 * the user picked, and automatic trips, which were labelled by the Home and Office circles they crossed.
 */
export function retagTrips(trips: Trip[], places: SavedPlaces): Trip[] {
  return trips.map((trip) => (trip.directionByUser || trip.auto ? trip : { ...trip, direction: tagDirection(trip.start, trip.end, places) }));
}

export type PlaceKind = keyof SavedPlaces;

export function withPlace(places: SavedPlaces, kind: PlaceKind, where: LatLng | null, label?: string): SavedPlaces {
  const next = { ...places };
  if (where) next[kind] = label ? { lat: where.lat, lng: where.lng, label } : { lat: where.lat, lng: where.lng };
  else delete next[kind];
  return next;
}
