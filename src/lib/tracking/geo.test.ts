import { describe, expect, it } from 'vitest';
import { haversineMeters } from './geo';

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters({ lat: 12.97, lng: 77.59 }, { lat: 12.97, lng: 77.59 })).toBe(0);
  });

  it('one degree of latitude is about 111.2 km', () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('matches a known real distance: Bengaluru to Chennai is roughly 290 km', () => {
    const d = haversineMeters({ lat: 12.9716, lng: 77.5946 }, { lat: 13.0827, lng: 80.2707 });
    expect(d / 1000).toBeGreaterThan(285);
    expect(d / 1000).toBeLessThan(295);
  });

  it('is symmetric', () => {
    const a = { lat: 19.076, lng: 72.8777 };
    const b = { lat: 28.6139, lng: 77.209 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it('longitude shrinks with latitude: a degree is shorter near the pole than at the equator', () => {
    const equator = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const north = haversineMeters({ lat: 60, lng: 0 }, { lat: 60, lng: 1 });
    expect(north).toBeLessThan(equator * 0.55);
  });
});
