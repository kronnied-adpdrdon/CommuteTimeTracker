export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * A single GPS reading. `timestamp` is epoch milliseconds; `accuracy` is the error radius in metres;
 * `speed` is the chip's own measured speed in m/s, when the device provides one.
 */
export interface LocationFix extends LatLng {
  accuracy?: number;
  speed?: number | null;
  timestamp: number;
}

const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in metres (Haversine formula). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}
