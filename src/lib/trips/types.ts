import { LatLng } from '../tracking/geo';

/** `work` = heading to the office, `home` = heading home, `unknown` = could not tell. */
export type TripDirection = 'work' | 'home' | 'unknown';

export interface Trip {
  id: string;
  /** Epoch milliseconds. */
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  distanceMeters: number;
  direction: TripDirection;
  start?: LatLng;
  end?: LatLng;
}
