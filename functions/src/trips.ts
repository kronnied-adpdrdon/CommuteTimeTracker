/**
 * Checks what the app sends. Mirrors `SharedTrip` in `src/lib/sharing/records.ts`. Anything outside these limits
 * is refused, so the table only ever holds coarse, plausible commute records.
 */

export const MAX_ITEMS = 100;
/** Trips older than this are refused (the app sends up to 60 days back). */
export const MAX_AGE_DAYS = 90;

export interface SharedTrip {
  tripId: string;
  date: string;
  startSlot: number;
  weekday: number;
  durationSeconds: number;
  distanceKm: number;
  direction: 'work' | 'home' | 'other';
  auto: boolean;
  edited: boolean;
  fromCell: string | null;
  toCell: string | null;
}

export interface UploadBody {
  installId: string;
  appVersion: string;
  trips: SharedTrip[];
  deleted: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TRIP_ID = /^[A-Za-z0-9._:-]{1,80}$/;
const VERSION = /^[A-Za-z0-9.+_-]{1,20}$/;
const CELL = /^[0-9b-hjkmnp-z]{5}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export const isInstallId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
export const isTripId = (v: unknown): v is string => typeof v === 'string' && TRIP_ID.test(v);

/** Why a trip was refused, or null when it's fine. */
export function tripProblem(value: unknown, now: number): string | null {
  if (!value || typeof value !== 'object') return 'not an object';
  const t = value as Record<string, unknown>;
  if (!isTripId(t.tripId)) return 'tripId';
  if (typeof t.date !== 'string' || !DATE.test(t.date)) return 'date';
  const day = Date.parse(`${t.date}T00:00:00Z`);
  // The date is the phone's local day, so allow a day either side of UTC.
  if (!Number.isFinite(day) || day > now + DAY_MS || day < now - MAX_AGE_DAYS * DAY_MS) return 'date range';
  if (!isInt(t.weekday, 0, 6) || new Date(day).getUTCDay() !== t.weekday) return 'weekday';
  if (!isInt(t.startSlot, 0, 24 * 60 - 15) || t.startSlot % 15 !== 0) return 'startSlot';
  if (!isInt(t.durationSeconds, 30, 6 * 60 * 60)) return 'durationSeconds';
  if (typeof t.distanceKm !== 'number' || !(t.distanceKm >= 0 && t.distanceKm <= 300) || Math.round(t.distanceKm * 10) !== t.distanceKm * 10) return 'distanceKm';
  // Faster than 200 km/h door to door isn't a commute.
  if (t.distanceKm / (t.durationSeconds / 3600) > 200) return 'speed';
  if (t.direction !== 'work' && t.direction !== 'home' && t.direction !== 'other') return 'direction';
  if (typeof t.auto !== 'boolean' || typeof t.edited !== 'boolean') return 'flags';
  for (const cell of [t.fromCell, t.toCell]) if (cell !== null && (typeof cell !== 'string' || !CELL.test(cell))) return 'cell';
  return null;
}

export interface CheckedUpload {
  installId: string;
  appVersion: string;
  trips: SharedTrip[];
  deleted: string[];
  /** Trip ids (or positions) refused, for the log. The rest are still stored. */
  refused: string[];
}

/** Null when the envelope itself is malformed (nothing stored). Individual bad trips are refused, not the batch. */
export function checkUpload(body: unknown, now: number): CheckedUpload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!isInstallId(b.installId)) return null;
  if (typeof b.appVersion !== 'string' || !VERSION.test(b.appVersion)) return null;
  if (!Array.isArray(b.trips) || !Array.isArray(b.deleted) || b.trips.length + b.deleted.length > MAX_ITEMS) return null;
  const trips: SharedTrip[] = [];
  const refused: string[] = [];
  b.trips.forEach((trip, i) => {
    const problem = tripProblem(trip, now);
    if (problem) refused.push(`${isTripId((trip as SharedTrip)?.tripId) ? (trip as SharedTrip).tripId : `#${i}`}: ${problem}`);
    else trips.push(trip as SharedTrip);
  });
  const deleted = b.deleted.filter(isTripId);
  return { installId: b.installId, appVersion: b.appVersion, trips, deleted, refused };
}
