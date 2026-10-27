import { IconName } from './icons';

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

/** A film, for "N movies". */
export const MOVIE_SECONDS = 2.5 * 3600;
const PODCAST_SECONDS = 45 * 60;

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

/** One everyday comparison, shown as a big number and what it counts. */
export interface Analogy {
  id: string;
  icon: IconName;
  /** "13", or "3%" for the Moon. */
  value: string;
  /** "marathons", "of the way to the Moon". */
  label: string;
  /**
   * What it's about. Tiles shown together never share one, so nothing looks repeated: two kinds of rail, two
   * flights, a movie beside a movie marathon, the Moon as a distance beside the trip there.
   */
  topic: string;
}

interface Unit {
  id: string;
  icon: IconName;
  /** Defaults to the icon: comparisons with the same icon are the same sort of thing. */
  topic?: string;
  /** One of it: km for distances, seconds for times. */
  size: number;
  one: string;
  many: string;
  /** Shown from this many (default 2), so small fractions and "1 song" never come up. */
  min?: number;
}

/**
 * Distances: Indian references only (the user's call), one landmark from each big city so no city feels left out,
 * plus the Earth and the Moon for big totals. Rounded figures; check them before changing any.
 */
const DISTANCE_UNITS: Unit[] = [
  { id: 'howrah', icon: 'bridge', size: 0.705, one: 'crossing of Howrah Bridge', many: 'crossings of Howrah Bridge' },
  { id: 'sea-link', icon: 'bridge', size: 5.6, one: 'trip across the Bandra–Worli Sea Link', many: 'trips across the Bandra–Worli Sea Link' },
  { id: 'marina', icon: 'wave', size: 6, one: 'walk along Chennai\'s Marina Beach', many: 'walks along Chennai\'s Marina Beach' },
  { id: 'namma-metro', icon: 'train', size: 43, one: 'ride on Namma Metro\'s Purple Line, end to end', many: 'rides on Namma Metro\'s Purple Line, end to end' },
  { id: 'delhi-metro', icon: 'train', size: 49, one: 'ride on Delhi Metro\'s Yellow Line, end to end', many: 'rides on Delhi Metro\'s Yellow Line, end to end' },
  { id: 'marathon', icon: 'medal', size: 42.195, one: 'marathon', many: 'marathons' },
  { id: 'ganga', icon: 'river', size: 2525, one: 'length of the Ganga', many: 'lengths of the Ganga' },
  { id: 'earth', icon: 'globe', size: 40075, one: 'trip around the Earth', many: 'trips around the Earth', min: 1 },
];

/** The Moon, counted in per cent of the way there; only for big totals (1% is 3,844 km). */
const MOON_KM = 384400;

/** Times: Indian and global, all "me time" rather than time lost. */
const TIME_UNITS: Unit[] = [
  { id: 'songs', icon: 'music', size: 3.5 * 60, one: 'song', many: 'songs' },
  { id: 'football', icon: 'football', size: 90 * 60, one: 'football match', many: 'football matches' },
  { id: 'podcasts', icon: 'headphones', size: PODCAST_SECONDS, one: 'podcast episode', many: 'podcast episodes' },
  { id: 'space-station', icon: 'satellite', size: 92 * 60, one: 'lap of the Earth by the space station', many: 'laps of the Earth by the space station' },
  { id: 'movies', icon: 'film', size: MOVIE_SECONDS, one: 'movie', many: 'movies' },
  { id: 't20', icon: 'ball', size: 3.5 * 3600, one: 'T20 match', many: 'T20 matches' },
  { id: 'trilogy', icon: 'film', size: 3 * MOVIE_SECONDS, one: 'movie-trilogy marathon', many: 'movie-trilogy marathons' },
  { id: 'london', icon: 'plane', size: 9.5 * 3600, one: 'flight from Delhi to London', many: 'flights from Delhi to London' },
  { id: 'rajdhani', icon: 'train', size: 16 * 3600, one: 'Rajdhani ride from Mumbai to Delhi', many: 'Rajdhani rides from Mumbai to Delhi' },
  { id: 'new-york', icon: 'plane', size: 16 * 3600, one: 'flight from Mumbai to New York', many: 'flights from Mumbai to New York' },
  { id: 'test', icon: 'ball', size: 30 * 3600, one: 'five-day Test match', many: 'five-day Test matches' },
  { id: 'apollo', icon: 'rocket', topic: 'moon', size: 76 * 3600, one: 'Apollo 11 trip to the Moon', many: 'Apollo 11 trips to the Moon' },
];

/** Counts up to this read well ("13 marathons"); beyond it they're just big piles. */
const NICE_MAX = 500;
/** The count that reads best; comparisons are ranked by how close they come to it. */
const NICE_TARGET = 12;
/** The best few take turns at the top, one day to the next. */
const ROTATING = 4;

/**
 * Every comparison for a distance (metres) or a time (seconds) that gives a sensible number, best first. The best
 * few take turns at the top from day to day (`day`, e.g. days since 1970), so Insights reads fresh each visit.
 * `skip` leaves out ids already on screen.
 */
export function analogies(kind: 'distance' | 'time', amount: number, day: number, skip: string[] = []): Analogy[] {
  const value = kind === 'distance' ? amount / 1000 : amount;
  const ranked: (Analogy & { score: number })[] = [];
  for (const unit of kind === 'distance' ? DISTANCE_UNITS : TIME_UNITS) {
    const count = Math.floor(value / unit.size);
    if (count < (unit.min ?? 2) || count > NICE_MAX || skip.includes(unit.id)) continue;
    ranked.push({
      id: unit.id,
      icon: unit.icon,
      value: count.toLocaleString('en-IN'),
      label: count === 1 ? unit.one : unit.many,
      topic: unit.topic ?? unit.icon,
      score: Math.abs(Math.log10(count) - Math.log10(NICE_TARGET)),
    });
  }
  const moon = Math.floor((value / MOON_KM) * 100);
  if (kind === 'distance' && moon >= 1 && !skip.includes('moon')) {
    ranked.push({ id: 'moon', icon: 'moon', value: `${moon}%`, label: 'of the way to the Moon', topic: 'moon', score: 0.3 });
  }
  ranked.sort((a, b) => a.score - b.score);

  const top = ranked.slice(0, ROTATING);
  const turn = top.length ? Math.abs(Math.floor(day)) % top.length : 0;
  return [...top.slice(turn), ...top.slice(0, turn), ...ranked.slice(ROTATING)].map(({ id, icon, value, label, topic }) => ({ id, icon, value, label, topic }));
}

/**
 * A set of tiles shown together, each drawing from its own list (e.g. two distance tiles, two time tiles). `picks`
 * holds each tile's place in its list, or -1 for an empty tile. No two tiles ever show the same comparison or topic.
 */
export interface TileSet {
  lists: Analogy[][];
  picks: number[];
}

/** Whether `candidate` can go on `tile` without repeating anything another tile shows. */
function fits(set: TileSet, tile: number, candidate: Analogy): boolean {
  return set.picks.every((pick, other) => {
    if (other === tile || pick < 0) return true;
    const shown = set.lists[other][pick];
    return shown.id !== candidate.id && shown.topic !== candidate.topic;
  });
}

/** The opening tiles: each takes the first comparison in its list that doesn't repeat an earlier tile. */
export function firstTiles(lists: Analogy[][]): TileSet {
  const set: TileSet = { lists, picks: lists.map(() => -1) };
  lists.forEach((list, tile) => {
    set.picks[tile] = list.findIndex((a) => fits(set, tile, a));
  });
  return set;
}

/** After a tap on `tile`: it moves on to the next comparison in its list that repeats nothing; the others stay. */
export function nextTile(set: TileSet, tile: number): TileSet {
  const list = set.lists[tile];
  const from = set.picks[tile];
  for (let step = 1; step < list.length; step++) {
    const i = (from + step + list.length) % list.length;
    if (fits(set, tile, list[i])) return { ...set, picks: set.picks.map((p, t) => (t === tile ? i : p)) };
  }
  return set;
}

/** Days since 1 January 1970 in local time, for `analogies`' daily turn. */
export function dayNumber(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}
