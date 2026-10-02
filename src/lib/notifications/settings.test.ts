import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_KEY,
  clockToMinutes,
  createNotificationSettingsStore,
  minutesToClock,
  sanitize,
} from './settings';

describe('notification settings', () => {
  it('starts with the defaults and remembers changes', async () => {
    const store = createMemoryStore();
    const settings = createNotificationSettingsStore(store);
    expect(await settings.load()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    await settings.save({ ...DEFAULT_NOTIFICATION_SETTINGS, weekly: false, eveningMinutes: 20 * 60 + 30 });
    expect(await createNotificationSettingsStore(store).load()).toMatchObject({ weekly: false, eveningMinutes: 1230 });
  });

  it('survives damaged or partial data', async () => {
    const store = createMemoryStore();
    await store.set(NOTIFICATION_SETTINGS_KEY, '{nope');
    expect(await createNotificationSettingsStore(store).load()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(sanitize({ weekly: 'yes', eveningMinutes: 5000, leaveNow: false })).toEqual({ ...DEFAULT_NOTIFICATION_SETTINGS, leaveNow: false });
    expect(sanitize(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('converts between minutes and clock text', () => {
    expect(minutesToClock(19 * 60)).toBe('19:00');
    expect(minutesToClock(7 * 60 + 5)).toBe('07:05');
    expect(clockToMinutes('19:30')).toBe(1170);
    expect(clockToMinutes('24:00')).toBeNull();
    expect(clockToMinutes('abc')).toBeNull();
  });
});
