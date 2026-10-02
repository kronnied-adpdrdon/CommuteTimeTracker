import { SavedPlaces, tagDirection } from './direction';
import { Trip } from './types';

/** Sample trips carry this id prefix so they can be told apart from real ones and removed again. */
export const SAMPLE_PREFIX = 'sample-';

export const isSampleTrip = (trip: Trip) => trip.id.startsWith(SAMPLE_PREFIX);

const HOME = { lat: 12.9352, lng: 77.6245 };
const OFFICE = { lat: 12.9756, lng: 77.607 };
/** Far from both places, so errands between them stay unlabelled. */
const ERRAND_FROM = { lat: 13.0358, lng: 77.597 };
const ERRAND_TO = { lat: 12.9279, lng: 77.6271 };

export const SAMPLE_PLACES: SavedPlaces = {
  home: { ...HOME, label: 'Sample Home, Koramangala, Bengaluru' },
  office: { ...OFFICE, label: 'Sample Office, MG Road, Bengaluru' },
};

/** Days of history generated, counting back from yesterday. Enough to cover all of last month. */
const DAYS = 75;

/** A small deterministic random generator, so the same data comes out every time. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * Realistic commute history for testing every Free and Pro feature at once:
 * - about 10 weeks of weekday trips (older than 2 weeks for Pro reports, all of last month for the monthly recap),
 * - a steady habit, so "time to leave" and "forgot to track" have something to learn from,
 * - Tuesdays that run clearly slower, so the slow-day heads-up has something to say,
 * - trips this week and last week for the weekly summary,
 * - two weekend errands that stay unlabelled,
 * - no trip today, so today's reminders can still fire.
 * Trips start and end at `SAMPLE_PLACES`, so changing Home or Office re-labels them like real trips.
 */
export function generateSampleTrips(now: number): { trips: Trip[]; places: SavedPlaces } {
  const random = seeded(20261002);
  const jitter = (base: number, spread: number) => base + (random() - 0.5) * 2 * spread;
  const near = (point: { lat: number; lng: number }) => ({ lat: jitter(point.lat, 0.0007), lng: jitter(point.lng, 0.0007) });
  const today = new Date(now);
  const trips: Trip[] = [];

  const add = (day: Date, hour: number, minute: number, minutes: number, meters: number, id: string, from: typeof HOME, to: typeof HOME) => {
    const startedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.round(minute)).getTime();
    const durationSeconds = Math.round(minutes * 60);
    const start = near(from);
    const end = near(to);
    trips.push({
      id: `${SAMPLE_PREFIX}${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}-${id}`,
      startedAt,
      endedAt: startedAt + durationSeconds * 1000,
      durationSeconds,
      distanceMeters: Math.round(meters),
      direction: 'unknown',
      start,
      end,
    });
  };

  let saturdays = 0;
  for (let back = 1; back <= DAYS; back++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    const weekday = day.getDay();
    if (weekday === 6 && ++saturdays % 4 === 2) {
      add(day, 11, jitter(30, 10), jitter(24, 3), jitter(8200, 400), 'errand', ERRAND_FROM, ERRAND_TO);
      continue;
    }
    if (weekday === 0 || weekday === 6) continue;
    if (random() < 0.12) continue; // working from home

    // Tuesdays are the slow day; Fridays are a little quicker in the morning.
    const slowdown = weekday === 2 ? 15 : weekday === 5 ? -4 : weekday === 1 ? 2 : 0;
    add(day, 8, jitter(30, 18), jitter(38 + slowdown, 4), jitter(12400, 600), 'w', HOME, OFFICE);
    if (random() < 0.94) {
      add(day, 18, jitter(10, 30), jitter(41 + (weekday === 2 ? 11 : 0), 5), jitter(12600, 600), 'h', OFFICE, HOME);
    }
  }

  const places = SAMPLE_PLACES;
  return {
    places,
    trips: trips
      .map((trip) => ({ ...trip, direction: tagDirection(trip.start, trip.end, places) }))
      .sort((a, b) => b.startedAt - a.startedAt),
  };
}
