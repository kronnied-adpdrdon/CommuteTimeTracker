import { LatLng } from '../tracking/geo';

/** `work` = heading to the office, `home` = heading home, `unknown` = could not tell. */
export type TripDirection = 'work' | 'home' | 'unknown';

/** What the app recorded before the user first edited a trip. Kept on the phone, never shown. */
export interface TripOriginal {
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  distanceMeters: number;
  direction: TripDirection;
}

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
  /** Set on the first edit and never overwritten, so the trip shows as edited. Absent on older trips. */
  original?: TripOriginal;
  /** The user picked work / home, so changing Home or Office leaves the direction alone. */
  directionByUser?: boolean;
  /** Started and stopped automatically, by leaving Home or Office and arriving at the other. */
  auto?: boolean;
}
