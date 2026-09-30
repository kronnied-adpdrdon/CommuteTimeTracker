import { LocationFix, haversineMeters } from './geo';

export interface TrackerOptions {
  /** Fixes less accurate than this are ignored entirely. */
  maxAccuracyMeters: number;
  /** Movement smaller than this (or than the fix's own accuracy, if larger) is treated as GPS jitter. */
  minMoveMeters: number;
  /** Movement implying a higher speed than this is treated as a GPS jump. 70 m/s is about 250 km/h. */
  maxSpeedMps: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  maxAccuracyMeters: 50,
  minMoveMeters: 10,
  maxSpeedMps: 70,
};

export interface TrackerState {
  distanceMeters: number;
  /** The last fix that counted. Movement is always measured from here, so slow real movement still adds up. */
  anchor: LocationFix | null;
  acceptedFixes: number;
  rejectedFixes: number;
}

export function initialTrackerState(): TrackerState {
  return { distanceMeters: 0, anchor: null, acceptedFixes: 0, rejectedFixes: 0 };
}

/**
 * Feed one GPS fix into the running trip. Returns a new state; the input is not modified.
 *
 * A fix is rejected (and the anchor left in place) when it is too inaccurate, out of order,
 * within jitter range of the anchor, or implies an impossible speed.
 */
export function addFix(
  state: TrackerState,
  fix: LocationFix,
  options: TrackerOptions = DEFAULT_TRACKER_OPTIONS,
): TrackerState {
  const reject = (): TrackerState => ({ ...state, rejectedFixes: state.rejectedFixes + 1 });

  if (fix.accuracy !== undefined && fix.accuracy > options.maxAccuracyMeters) {
    return reject();
  }

  if (state.anchor === null) {
    return { ...state, anchor: fix, acceptedFixes: state.acceptedFixes + 1 };
  }

  const seconds = (fix.timestamp - state.anchor.timestamp) / 1000;
  if (seconds <= 0) {
    return reject();
  }

  const meters = haversineMeters(state.anchor, fix);
  const jitterThreshold = Math.max(options.minMoveMeters, fix.accuracy ?? 0);
  if (meters < jitterThreshold) {
    return reject();
  }

  if (meters / seconds > options.maxSpeedMps) {
    return reject();
  }

  return {
    distanceMeters: state.distanceMeters + meters,
    anchor: fix,
    acceptedFixes: state.acceptedFixes + 1,
    rejectedFixes: state.rejectedFixes,
  };
}
