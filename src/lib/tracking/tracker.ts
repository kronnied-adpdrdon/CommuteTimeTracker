import { LocationFix, haversineMeters } from './geo';

export interface TrackerOptions {
  /** Fixes less accurate than this are ignored entirely. */
  maxAccuracyMeters: number;
  /** Movement smaller than this is treated as GPS jitter. */
  minMoveMeters: number;
  /** Movement smaller than this multiple of the fix's accuracy is also treated as jitter. */
  accuracyMultiplier: number;
  /** A move implying a higher speed than this means one of the two readings is wrong. 70 m/s is about 250 km/h. */
  maxSpeedMps: number;
  /** Below this chip-measured speed the phone is treated as standing still, whatever the positions say. */
  stationarySpeedMps: number;
  /** During warm-up, two readings further apart in time than this don't confirm each other. */
  warmupMaxGapSeconds: number;
  /** Out-and-back legs shorter than this are never treated as a spike (protects real U-turns). */
  spikeMinLegMeters: number;
  /** A return that lands within this fraction of the shorter leg of where it started marks a spike. */
  spikeReturnRatio: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  maxAccuracyMeters: 50,
  minMoveMeters: 10,
  accuracyMultiplier: 2,
  maxSpeedMps: 70,
  stationarySpeedMps: 0.5,
  warmupMaxGapSeconds: 30,
  spikeMinLegMeters: 100,
  spikeReturnRatio: 0.3,
};

/** The most recent leg added to the trip. Kept separate so it can be undone if its end turns out to be a glitch. */
export interface PendingLeg {
  from: LocationFix;
  meters: number;
}

export interface TrackerState {
  /** Distance that can no longer be undone. Use `totalDistanceMeters` for the trip's distance. */
  committedMeters: number;
  /** The latest trusted position. Movement is measured from here, so slow real movement still adds up. */
  anchor: LocationFix | null;
  /** The leg that ends at `anchor`, not yet committed. */
  pending: PendingLeg | null;
  /** The most recent believable reading. Speed checks are measured from here, not from `anchor`. */
  last: LocationFix | null;
  /** Warm-up: the first reading, waiting for a second one to agree with it. */
  candidate: LocationFix | null;
  /** A reading that was an impossible jump from `last`. If the next reading agrees with it, `last` was the bad one. */
  suspect: LocationFix | null;
  acceptedFixes: number;
  rejectedFixes: number;
}

export function initialTrackerState(): TrackerState {
  return {
    committedMeters: 0,
    anchor: null,
    pending: null,
    last: null,
    candidate: null,
    suspect: null,
    acceptedFixes: 0,
    rejectedFixes: 0,
  };
}

/** The trip's distance so far, including the most recent leg. */
export function totalDistanceMeters(state: TrackerState): number {
  return state.committedMeters + (state.pending?.meters ?? 0);
}

const secondsBetween = (a: LocationFix, b: LocationFix) => (b.timestamp - a.timestamp) / 1000;

function isPlausible(a: LocationFix, b: LocationFix, options: TrackerOptions): boolean {
  const seconds = secondsBetween(a, b);
  return seconds > 0 && haversineMeters(a, b) / seconds <= options.maxSpeedMps;
}

const ignore = (state: TrackerState, patch: Partial<TrackerState> = {}): TrackerState => ({
  ...state,
  ...patch,
  rejectedFixes: state.rejectedFixes + 1,
});

/**
 * Feed one GPS reading into the running trip. Returns a new state; the input is not modified.
 *
 * Distance is only ever added for believable movement. An impossible jump never adds distance: either
 * the jump is ignored, or (when two readings agree on the new place) the trip re-anchors there for free.
 */
export function addFix(
  state: TrackerState,
  fix: LocationFix,
  options: TrackerOptions = DEFAULT_TRACKER_OPTIONS,
): TrackerState {
  if (fix.accuracy !== undefined && fix.accuracy > options.maxAccuracyMeters) {
    return ignore(state);
  }

  let s = state;

  // Warm-up: the first reading of a trip is often a cold-start glitch, so trust it only once a
  // second, believable reading agrees with it.
  if (s.anchor === null) {
    const candidate = s.candidate;
    if (candidate !== null && fix.timestamp <= candidate.timestamp) {
      return ignore(s);
    }
    if (candidate === null) {
      return { ...s, candidate: fix };
    }
    if (secondsBetween(candidate, fix) > options.warmupMaxGapSeconds || !isPlausible(candidate, fix, options)) {
      // The two readings disagree. Keep the newer one as the candidate; the older one is discarded.
      return ignore(s, { candidate: fix });
    }
    s = { ...s, anchor: candidate, last: candidate, candidate: null, acceptedFixes: s.acceptedFixes + 1 };
  }

  const last = s.last!;
  if (fix.timestamp <= last.timestamp) {
    return ignore(s);
  }

  if (!isPlausible(last, fix, options)) {
    const suspect = s.suspect;
    if (suspect !== null && fix.timestamp > suspect.timestamp && isPlausible(suspect, fix, options)) {
      // Two readings agree with each other but not with `last`, so `last` was the bad one.
      // Re-anchor here without adding any distance, and drop the leg that led to the bad position.
      return {
        ...s,
        anchor: fix,
        pending: null,
        last: fix,
        suspect: null,
        acceptedFixes: s.acceptedFixes + 1,
      };
    }
    return ignore(s, { suspect: fix });
  }

  s = { ...s, last: fix, suspect: null };

  // The chip's measured speed is far more reliable than comparing positions, so trust it when present.
  if (fix.speed != null && fix.speed < options.stationarySpeedMps) {
    return ignore(s);
  }

  const anchor = s.anchor!;
  const jitterThreshold = Math.max(options.minMoveMeters, options.accuracyMultiplier * (fix.accuracy ?? 0));
  const meters = haversineMeters(anchor, fix);
  if (meters < jitterThreshold) {
    return ignore(s);
  }

  // Out-and-back spike: the anchor was far from both its predecessor and this reading, and this
  // reading is back near the predecessor. The anchor was a glitch, so measure from before it.
  const pending = s.pending;
  if (pending !== null && pending.meters >= options.spikeMinLegMeters && meters >= options.spikeMinLegMeters) {
    const direct = haversineMeters(pending.from, fix);
    if (direct < options.spikeReturnRatio * Math.min(pending.meters, meters)) {
      const beforeSpike = { ...s, anchor: pending.from, pending: null };
      if (direct < jitterThreshold) {
        return ignore(beforeSpike);
      }
      return {
        ...beforeSpike,
        anchor: fix,
        pending: { from: pending.from, meters: direct },
        acceptedFixes: s.acceptedFixes + 1,
      };
    }
  }

  return {
    ...s,
    committedMeters: s.committedMeters + (pending?.meters ?? 0),
    anchor: fix,
    pending: { from: anchor, meters },
    acceptedFixes: s.acceptedFixes + 1,
  };
}
