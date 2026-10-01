import { describe, expect, it } from 'vitest';
import { formatClock, formatDayLabel, formatDistanceKm, formatDuration, formatTimeOfDay, formatTimeRange } from './format';

describe('formatClock', () => {
  it('formats hh:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(1716)).toBe('00:28:36');
    expect(formatClock(3661)).toBe('01:01:01');
  });
  it('clamps negatives and drops fractions', () => {
    expect(formatClock(-5)).toBe('00:00:00');
    expect(formatClock(59.9)).toBe('00:00:59');
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3900)).toBe('1h 05m');
    expect(formatDuration(3300)).toBe('0h 55m');
    expect(formatDuration(33600)).toBe('9h 20m');
  });
});

describe('formatDistanceKm', () => {
  it('uses one decimal', () => {
    expect(formatDistanceKm(12400)).toBe('12.4 km');
    expect(formatDistanceKm(800)).toBe('0.8 km');
    expect(formatDistanceKm(-3)).toBe('0.0 km');
  });
});

describe('formatTimeRange', () => {
  it('uses local 24-hour time', () => {
    const start = new Date(2026, 8, 28, 8, 5).getTime();
    const end = new Date(2026, 8, 28, 19, 10).getTime();
    expect(formatTimeRange(start, end)).toBe('08:05 - 19:10');
  });
});

describe('formatTimeOfDay', () => {
  it('pads hours and minutes', () => {
    expect(formatTimeOfDay(new Date(2026, 8, 28, 7, 3).getTime())).toBe('07:03');
  });
});

describe('formatDayLabel', () => {
  it('matches the design: "16 Sep (Tue)"', () => {
    expect(formatDayLabel(new Date(2025, 8, 16, 9).getTime())).toBe('16 Sep (Tue)');
  });
  it('can include the year', () => {
    expect(formatDayLabel(new Date(2025, 8, 16, 9).getTime(), true)).toBe('16 Sep 2025 (Tue)');
  });
});
