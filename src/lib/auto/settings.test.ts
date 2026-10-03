import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { DEFAULT_AUTO_SETTINGS, clampRadius, createAutoSettingsStore, placesTooClose, sanitize, toggleDay } from './settings';

describe('auto settings', () => {
  it('starts off, with Mon-Fri 7-10am and 4-8pm and 150 m circles', async () => {
    const settings = await createAutoSettingsStore(createMemoryStore()).load();
    expect(settings).toEqual(DEFAULT_AUTO_SETTINGS);
    expect(settings.enabled).toBe(false);
    expect(settings.days).toEqual([1, 2, 3, 4, 5]);
    expect(settings.homeRadius).toBe(150);
  });

  it('saves and loads', async () => {
    const store = createAutoSettingsStore(createMemoryStore());
    await store.save({ ...DEFAULT_AUTO_SETTINGS, enabled: true, officeRadius: 400 });
    expect(await store.load()).toMatchObject({ enabled: true, officeRadius: 400 });
  });

  it('repairs damaged values instead of failing', () => {
    const repaired = sanitize({ enabled: 'yes', morningStart: 9999, days: [1, 1, 9, 'x', 0], homeRadius: 20, officeRadius: 'big' });
    expect(repaired.enabled).toBe(false);
    expect(repaired.morningStart).toBe(7 * 60);
    expect(repaired.days).toEqual([0, 1]);
    expect(repaired.homeRadius).toBe(100);
    expect(repaired.officeRadius).toBe(150);
    expect(sanitize(null)).toEqual(DEFAULT_AUTO_SETTINGS);
  });

  it('keeps circles between 100 m and 1 km', () => {
    expect(clampRadius(50)).toBe(100);
    expect(clampRadius(5000)).toBe(1000);
    expect(clampRadius(333.4)).toBe(333);
  });

  it('turns days on and off', () => {
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3]);
    expect(toggleDay([1, 3], 0)).toEqual([0, 1, 3]);
  });

  it('knows when Home and Office are too close to tell apart', () => {
    const home = { lat: 12.97, lng: 77.59 };
    const near = { lat: 12.97 + 250 / 111_195, lng: 77.59 };
    const far = { lat: 12.97 + 2000 / 111_195, lng: 77.59 };
    expect(placesTooClose({ home, office: near }, DEFAULT_AUTO_SETTINGS)).toBe(true);
    expect(placesTooClose({ home, office: far }, DEFAULT_AUTO_SETTINGS)).toBe(false);
    expect(placesTooClose({ home }, DEFAULT_AUTO_SETTINGS)).toBe(false);
  });
});
