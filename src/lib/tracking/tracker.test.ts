import { describe, expect, it } from 'vitest';
import { LocationFix } from './geo';
import { addFix, initialTrackerState, TrackerState } from './tracker';

// ~111.2 m per 0.001 degrees of latitude.
const fix = (latOffset: number, seconds: number, accuracy?: number): LocationFix => ({
  lat: 12.97 + latOffset,
  lng: 77.59,
  accuracy,
  timestamp: 1_000_000 + seconds * 1000,
});

const run = (fixes: LocationFix[]): TrackerState => fixes.reduce((state, f) => addFix(state, f), initialTrackerState());

describe('addFix', () => {
  it('the first fix only sets the starting point', () => {
    const s = run([fix(0, 0, 5)]);
    expect(s.distanceMeters).toBe(0);
    expect(s.acceptedFixes).toBe(1);
  });

  it('adds up real movement', () => {
    // Four steps of ~111 m, 10 s apart (about 40 km/h).
    const s = run([fix(0, 0, 5), fix(0.001, 10, 5), fix(0.002, 20, 5), fix(0.003, 30, 5), fix(0.004, 40, 5)]);
    expect(s.distanceMeters).toBeGreaterThan(440);
    expect(s.distanceMeters).toBeLessThan(450);
    expect(s.acceptedFixes).toBe(5);
  });

  it('a phone sitting still does not gain distance from jitter', () => {
    const jitter = [0, 0.00002, -0.00001, 0.00003, -0.00002, 0.00001, 0.00002];
    const s = run(jitter.map((o, i) => fix(o, i * 5, 15)));
    expect(s.distanceMeters).toBe(0);
  });

  it('ignores fixes with poor accuracy', () => {
    const s = run([fix(0, 0, 5), fix(0.001, 10, 200), fix(0.002, 20, 5)]);
    expect(s.rejectedFixes).toBe(1);
    expect(s.distanceMeters).toBeGreaterThan(220);
    expect(s.distanceMeters).toBeLessThan(225);
  });

  it('ignores an impossible GPS jump (5 km in 5 seconds)', () => {
    const s = run([fix(0, 0, 5), fix(0.045, 5, 5), fix(0.001, 10, 5)]);
    expect(s.rejectedFixes).toBe(1);
    expect(s.distanceMeters).toBeLessThan(120);
  });

  it('slow walking still adds up, because movement is measured from the last counted point', () => {
    // ~1.4 m/s with 5 s between fixes: each hop is ~7 m (below the jitter limit) but it accumulates.
    const fixes = Array.from({ length: 30 }, (_, i) => fix(i * 0.0000629, i * 5, 5));
    const s = run(fixes);
    expect(s.distanceMeters).toBeGreaterThan(150);
    expect(s.distanceMeters).toBeLessThan(215);
  });

  it('ignores out-of-order fixes', () => {
    const s = run([fix(0, 10, 5), fix(0.001, 5, 5)]);
    expect(s.rejectedFixes).toBe(1);
    expect(s.distanceMeters).toBe(0);
  });

  it('accepts fixes that have no accuracy value', () => {
    const s = run([fix(0, 0), fix(0.001, 10)]);
    expect(s.distanceMeters).toBeGreaterThan(105);
  });

  it('does not modify the state it is given', () => {
    const before = initialTrackerState();
    addFix(before, fix(0, 0, 5));
    expect(before).toEqual(initialTrackerState());
  });
});
