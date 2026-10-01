import { describe, expect, it } from 'vitest';
import { LocationFix } from './geo';
import { addFix, initialTrackerState, totalDistanceMeters, TrackerState } from './tracker';

const METERS_PER_DEGREE_LAT = 111_195;

/** A reading `north` metres north of a fixed point, `seconds` into the trip. */
const at = (north: number, seconds: number, accuracy?: number, speed?: number | null): LocationFix => ({
  lat: 12.97 + north / METERS_PER_DEGREE_LAT,
  lng: 77.59,
  accuracy,
  speed,
  timestamp: 1_000_000 + seconds * 1000,
});

const run = (fixes: LocationFix[]): TrackerState =>
  fixes.reduce((state, f) => addFix(state, f), initialTrackerState());

const km = (fixes: LocationFix[]) => totalDistanceMeters(run(fixes)) / 1000;

/** A steady drive north from `fromMeters`, one reading every 5 s at `mps`. */
const drive = (fromMeters: number, toMeters: number, startSeconds: number, mps = 10, accuracy = 8): LocationFix[] => {
  const fixes: LocationFix[] = [];
  const step = mps * 5 * Math.sign(toMeters - fromMeters);
  for (let d = fromMeters, t = startSeconds; step > 0 ? d <= toMeters : d >= toMeters; d += step, t += 5) {
    fixes.push(at(d, t, accuracy));
  }
  return fixes;
};

describe('addFix: normal driving', () => {
  it('measures a clean 5 km drive', () => {
    expect(km(drive(0, 5000, 0))).toBeCloseTo(5, 2);
  });

  it('a real U-turn is not mistaken for a glitch', () => {
    expect(km([...drive(0, 500, 0), ...drive(450, 0, 55)])).toBeCloseTo(1, 1);
  });

  it('slow walking still adds up, because movement is measured from the last trusted point', () => {
    // ~1.4 m/s with 5 s between readings: each hop (~7 m) is below the jitter limit, but it accumulates.
    const fixes = Array.from({ length: 30 }, (_, i) => at(i * 7, i * 5, 5));
    expect(totalDistanceMeters(run(fixes))).toBeGreaterThan(150);
    expect(totalDistanceMeters(run(fixes))).toBeLessThan(215);
  });

  it('keeps the straight-line distance across a signal gap when the move is believable', () => {
    // Tunnel: no readings for 60 s while driving 600 m, then readings resume.
    expect(km([...drive(0, 1000, 0), ...drive(1600, 2000, 160)])).toBeCloseTo(2, 1);
  });

  it('accepts readings that have no accuracy value', () => {
    expect(totalDistanceMeters(run([at(0, 0), at(50, 5), at(160, 15)]))).toBeGreaterThan(155);
  });
});

describe('addFix: warm-up', () => {
  it('does not trust the first reading until a second one agrees', () => {
    const s = run([at(0, 0, 5)]);
    expect(s.anchor).toBeNull();
    expect(totalDistanceMeters(s)).toBe(0);
  });

  it('a glitchy first reading does not poison the trip', () => {
    // First reading 3 km off (a cold-start glitch), then a real 5 km drive.
    expect(km([at(3000, 0, 40), ...drive(0, 5000, 5)])).toBeCloseTo(5, 1);
  });
});

describe('addFix: standing still', () => {
  it('a parked phone wobbling a few metres gains nothing', () => {
    const wobble = [0, 2, -1, 3, -2, 1, 2];
    expect(totalDistanceMeters(run(wobble.map((o, i) => at(o, i * 5, 15))))).toBe(0);
  });

  it('waiting at a signal with readings drifting 15 m gains nothing', () => {
    const fixes = Array.from({ length: 37 }, (_, i) => at(i % 2 === 0 ? 0 : 15, i * 5, 10));
    expect(totalDistanceMeters(run(fixes))).toBe(0);
  });

  it('trusts the chip speed: a 30 m drift counts as nothing when the phone reports it is not moving', () => {
    const fixes = Array.from({ length: 20 }, (_, i) => at(i % 2 === 0 ? 0 : 30, i * 5, 5, 0.1));
    expect(totalDistanceMeters(run(fixes))).toBe(0);
  });

  it('a wrong speed of 0 while clearly moving (as the emulator reports) does not erase the trip', () => {
    const fixes = Array.from({ length: 21 }, (_, i) => at(i * 50, i * 5, 5, 0));
    expect(km(fixes)).toBeCloseTo(1, 1);
  });

  it('still counts movement when the chip reports a walking speed', () => {
    const fixes = Array.from({ length: 20 }, (_, i) => at(i * 7, i * 5, 5, 1.4));
    expect(totalDistanceMeters(run(fixes))).toBeGreaterThan(100);
  });
});

describe('addFix: glitches', () => {
  it('ignores readings with poor accuracy', () => {
    const s = run([at(0, 0, 5), at(111, 10, 5), at(222, 20, 200), at(333, 30, 5)]);
    expect(s.rejectedFixes).toBe(1);
    expect(totalDistanceMeters(s)).toBeCloseTo(333, -1);
  });

  it('parked 10 min, then one glitch 2 km away: no phantom distance', () => {
    const parked = Array.from({ length: 121 }, (_, i) => at((i % 2) * 5, i * 5, 8));
    const after = Array.from({ length: 19 }, (_, i) => at(0, 610 + i * 5, 8));
    expect(km([...parked, at(2000, 605, 30), ...after])).toBeLessThan(0.02);
  });

  it('ignores an impossible jump mid-drive', () => {
    const fixes = [...drive(0, 500, 0), at(5500, 55, 5), ...drive(550, 1000, 60)];
    expect(km(fixes)).toBeCloseTo(1, 1);
  });

  it('a glitch after a long gap, with a slow return, is caught as an out-and-back spike', () => {
    // Stopped at 1 km. Readings drop out for 2 min, the first one back is 2 km off, the next is correct.
    const fixes = [...drive(0, 1000, 0), at(3000, 220, 20), at(1000, 340, 8), at(1000, 345, 8)];
    expect(km(fixes)).toBeCloseTo(1, 1);
  });

  it('a glitch after a gap with a quick return re-anchors without adding distance', () => {
    const fixes = [...drive(0, 1000, 0), at(3000, 220, 20), at(1000, 225, 8), at(1000, 230, 8)];
    expect(km(fixes)).toBeCloseTo(1, 1);
  });

  it('ignores out-of-order readings', () => {
    const s = run([at(0, 10, 5), at(50, 15, 5), at(200, 12, 5)]);
    expect(totalDistanceMeters(s)).toBeCloseTo(50, -1);
  });
});

describe('addFix: purity', () => {
  it('does not modify the state it is given', () => {
    const before = run([at(0, 0, 5), at(50, 5, 5)]);
    const snapshot = structuredClone(before);
    addFix(before, at(200, 20, 5));
    expect(before).toEqual(snapshot);
  });
});
