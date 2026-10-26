/**
 * Distances and times in everyday terms, for Insights and the Wraps. Road distances are rounded and approximate,
 * so the wording always says "as far as", never an exact match.
 */

export interface Route {
  name: string;
  km: number;
}

/** Shortest first. Each one is roughly double the one before, so every month lands near one. */
export const ROUTES: Route[] = [
  { name: 'Bengaluru → Mysuru', km: 145 },
  { name: 'Delhi → Agra', km: 230 },
  { name: 'Bengaluru → Chennai', km: 345 },
  { name: 'Mumbai → Goa', km: 590 },
  { name: 'Mumbai → Bengaluru', km: 980 },
  { name: 'Delhi → Mumbai', km: 1400 },
  { name: 'Kashmir → Kanyakumari', km: 3700 },
  { name: 'the whole Golden Quadrilateral', km: 5850 },
  { name: 'once around the Earth', km: 40075 },
];

/** One lap of Mumbai's Marine Drive, for distances shorter than the first route. */
export const MARINE_DRIVE_KM = 3.6;

export interface DistanceComparison {
  /** e.g. "As far as Mumbai → Goa", "As far as Delhi → Agra, 2 times over", "12 laps of Marine Drive". */
  text: string;
  /** The two ends, for a route between two places ("Mumbai", "Goa"). Absent for laps and loops. */
  from?: string;
  to?: string;
  /** How many times over (1 for once). */
  times: number;
}

/** The longest route the distance covers, and how many times. Null under one lap of Marine Drive. */
export function compareDistance(meters: number): DistanceComparison | null {
  const km = Math.max(0, meters) / 1000;
  const route = [...ROUTES].reverse().find((r) => km >= r.km);
  if (route) {
    const times = Math.floor(km / route.km);
    const [from, to] = route.name.split(' → ');
    return { text: `As far as ${route.name}${times >= 2 ? `, ${times} times over` : ''}`, times, ...(to ? { from, to } : {}) };
  }
  const laps = Math.floor(km / MARINE_DRIVE_KM);
  if (laps < 1) return null;
  return { text: `${laps} ${laps === 1 ? 'lap' : 'laps'} of Mumbai's Marine Drive`, times: laps };
}

/** A film, for "N movies' worth". */
export const MOVIE_SECONDS = 2.5 * 3600;
const PODCAST_SECONDS = 45 * 60;

/** Time worded as "me time": "13 movies' worth", or podcast episodes for shorter spans. Null under one episode. */
export function compareTime(seconds: number): string | null {
  const movies = Math.floor(seconds / MOVIE_SECONDS);
  if (movies >= 2) return `${movies} movies' worth of time`;
  const episodes = Math.floor(seconds / PODCAST_SECONDS);
  if (episodes >= 1) return `${episodes} podcast ${episodes === 1 ? 'episode' : 'episodes'} of time`;
  return null;
}

/** 33 h and up as "33 h", shorter as "4 h 20 min" / "45 min". For big headline numbers. */
export function formatHours(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const h = Math.floor(minutes / 60);
  if (h >= 10) return `${h} h`;
  const m = minutes % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** 367200 -> "4 days 6 hours", 7200 -> "2 hours". Whole hours, rounded down. */
export function formatDaysHours(seconds: number): string {
  const hours = Math.floor(Math.max(0, seconds) / 3600);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (d === 0) return part(h, 'hour');
  return h === 0 ? part(d, 'day') : `${part(d, 'day')} ${part(h, 'hour')}`;
}
