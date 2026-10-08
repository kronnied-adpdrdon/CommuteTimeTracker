import { describe, expect, it } from 'vitest';
import { Trip } from '../trips/types';
import { commutePrompt, minutesPhrase } from './prompt';
import { DEFAULT_SHARING_SETTINGS } from './settings';

const trip = (id: string, startedAt: number, minutes: number): Trip => ({
  id,
  startedAt,
  endedAt: startedAt + minutes * 60_000,
  durationSeconds: minutes * 60,
  distanceMeters: 9000,
  direction: 'work',
});

const three = [trip('a', 1, 40), trip('b', 2, 44), trip('c', 3, 42)];

describe('commutePrompt', () => {
  it('waits for three real trips', () => {
    expect(commutePrompt(DEFAULT_SHARING_SETTINGS, three.slice(0, 2))).toBeNull();
    expect(commutePrompt(DEFAULT_SHARING_SETTINGS, [...three.slice(0, 2), trip('sample-20261006-1', 4, 30)])).toBeNull();
    expect(commutePrompt(DEFAULT_SHARING_SETTINGS, three)).toEqual({ averageMinutes: 42 });
  });

  it('averages the latest three trips', () => {
    expect(commutePrompt(DEFAULT_SHARING_SETTINGS, [...three, trip('old', 0, 400)])).toEqual({ averageMinutes: 42 });
  });

  it('never shows again once answered, either way', () => {
    expect(commutePrompt({ ...DEFAULT_SHARING_SETTINGS, commute: false }, three)).toBeNull();
    expect(commutePrompt({ ...DEFAULT_SHARING_SETTINGS, commute: true }, three)).toBeNull();
  });
});

describe('minutesPhrase', () => {
  it('reads naturally', () => {
    expect(minutesPhrase(42)).toBe('42 min');
    expect(minutesPhrase(60)).toBe('1 h');
    expect(minutesPhrase(65)).toBe('1 h 5 min');
  });
});
