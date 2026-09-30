import { LatLng, haversineMeters } from '../tracking/geo';
import { TripDirection } from './types';

export interface SavedPlaces {
  home?: LatLng;
  office?: LatLng;
}

/** A point within this distance of a saved place counts as being "at" it. */
export const PLACE_RADIUS_METERS = 500;

function isNear(point: LatLng | undefined, place: LatLng | undefined): boolean {
  return !!point && !!place && haversineMeters(point, place) <= PLACE_RADIUS_METERS;
}

/**
 * Decide whether a trip was to work or to home from where it started and ended.
 * Returns `unknown` when the saved places are missing, or the evidence is missing or contradictory,
 * rather than guessing.
 */
export function tagDirection(
  start: LatLng | undefined,
  end: LatLng | undefined,
  places: SavedPlaces,
): TripDirection {
  const towardsWork = isNear(start, places.home) || isNear(end, places.office);
  const towardsHome = isNear(start, places.office) || isNear(end, places.home);

  if (towardsWork && !towardsHome) return 'work';
  if (towardsHome && !towardsWork) return 'home';
  return 'unknown';
}
