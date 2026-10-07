import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import {
  INITIAL_PROGRESS,
  SETUP_KEY,
  SetupFacts,
  SetupProgress,
  batteryAdvice,
  checklist,
  createSetupStore,
  leaveTimeFromWindow,
  sanitize,
  windowFromLeaveTime,
  wizardSteps,
} from './logic';

const NEW_USER: SetupFacts = {
  isNewUser: true,
  placesSet: false,
  placesNeverAsk: false,
  autoEnabled: false,
  notificationsAllowed: false,
  manufacturer: 'Google',
  batteryUnrestricted: false,
  sharingAnswered: false,
};

const progress = (patch: Partial<SetupProgress> = {}): SetupProgress => ({ ...INITIAL_PROGRESS, ...patch });

describe('first-time setup: which screens to show', () => {
  it('walks a new user through everything, without a battery screen on a Pixel', () => {
    expect(wizardSteps(progress(), NEW_USER)).toEqual(['welcome', 'sharing', 'places', 'times', 'recording', 'reminders', 'done']);
  });

  it('adds the battery screen on phones that stop background apps', () => {
    expect(wizardSteps(progress(), { ...NEW_USER, manufacturer: 'Xiaomi' })).toEqual(['welcome', 'sharing', 'places', 'times', 'recording', 'reminders', 'battery', 'done']);
  });

  it('shows an existing user only what they have not set up, with no welcome', () => {
    const tester = { ...NEW_USER, isNewUser: false, placesSet: true, notificationsAllowed: true, sharingAnswered: true };
    expect(wizardSteps(progress(), tester)).toEqual(['times', 'recording', 'done']);
  });

  it('shows nothing to someone who has everything set up', () => {
    const done = { ...NEW_USER, isNewUser: false, placesSet: true, autoEnabled: true, notificationsAllowed: true, sharingAnswered: true };
    expect(wizardSteps(progress(), done)).toEqual([]);
  });

  it('resumes where the user stopped', () => {
    const halfway = progress({ seen: ['welcome', 'places', 'times'] });
    expect(wizardSteps(halfway, NEW_USER)).toEqual(['sharing', 'recording', 'reminders', 'done']);
  });

  it("doesn't reopen for the welcome screen alone", () => {
    const facts = { ...NEW_USER, placesSet: true, autoEnabled: true, notificationsAllowed: true, sharingAnswered: true };
    expect(wizardSteps(progress(), facts)).toEqual([]);
  });

  it('never opens again once closed', () => {
    expect(wizardSteps(progress({ closed: true }), { ...NEW_USER, sharingAnswered: true })).toEqual([]);
  });

  it('asks the sharing question once, on its own, of people who finished the setup before it existed', () => {
    expect(wizardSteps(progress({ closed: true }), NEW_USER)).toEqual(['sharing']);
    expect(wizardSteps(progress({ closed: true, seen: ['sharing'] }), NEW_USER)).toEqual([]);
    const allSet = { ...NEW_USER, isNewUser: false, placesSet: true, autoEnabled: true, notificationsAllowed: true };
    expect(wizardSteps(progress(), allSet)).toEqual(['sharing']);
  });

  it('treats a skipped sharing question as answered "no" and does not ask again', () => {
    expect(wizardSteps(progress({ seen: ['welcome', 'sharing'] }), NEW_USER)).toEqual(['places', 'times', 'recording', 'reminders', 'done']);
  });

  it('respects "Don\'t ask again" from the old Home/Office pop-up', () => {
    expect(wizardSteps(progress(), { ...NEW_USER, placesNeverAsk: true })).not.toContain('places');
  });

  it('skips commute times and the recording choice once a choice is made', () => {
    expect(wizardSteps(progress({ recording: 'manual' }), NEW_USER)).not.toContain('recording');
    expect(wizardSteps(progress(), { ...NEW_USER, autoEnabled: true })).not.toContain('times');
  });
});

describe('first-time setup: the Home checklist', () => {
  it('counts a deliberate "no" as done, and a skip as not done', () => {
    const answered = progress({ closed: true, recording: 'manual', reminders: 'off' });
    expect(checklist(answered, NEW_USER)).toEqual([
      { item: 'places', done: false },
      { item: 'recording', done: true },
      { item: 'reminders', done: true },
    ]);
  });

  it('keeps reminders open when Android refused notifications', () => {
    const items = checklist(progress({ reminders: 'on' }), { ...NEW_USER, notificationsAllowed: false });
    expect(items.find((i) => i.item === 'reminders')?.done).toBe(false);
  });

  it('counts reminders as done in a browser, where there is nothing to ask', () => {
    const items = checklist(progress(), { ...NEW_USER, notificationsAllowed: null, manufacturer: '' });
    expect(items.find((i) => i.item === 'reminders')?.done).toBe(true);
  });

  it("trusts Android's battery setting on Samsung but asks the user on Xiaomi", () => {
    const samsung = checklist(progress(), { ...NEW_USER, manufacturer: 'samsung', batteryUnrestricted: true });
    expect(samsung.find((i) => i.item === 'battery')?.done).toBe(true);
    const xiaomi = checklist(progress(), { ...NEW_USER, manufacturer: 'Xiaomi', batteryUnrestricted: true });
    expect(xiaomi.find((i) => i.item === 'battery')?.done).toBe(false);
    const confirmed = checklist(progress({ battery: 'done' }), { ...NEW_USER, manufacturer: 'Xiaomi' });
    expect(confirmed.find((i) => i.item === 'battery')?.done).toBe(true);
  });
});

describe('first-time setup: commute hours from leave times', () => {
  it('covers an hour before to 90 minutes after', () => {
    expect(windowFromLeaveTime(8 * 60 + 45)).toEqual({ start: 7 * 60 + 45, end: 10 * 60 + 15 });
    expect(leaveTimeFromWindow(7 * 60 + 45)).toBe(8 * 60 + 45);
  });

  it('wraps past midnight for night shifts', () => {
    expect(windowFromLeaveTime(23 * 60)).toEqual({ start: 22 * 60, end: 30 });
    expect(windowFromLeaveTime(30)).toEqual({ start: 23 * 60 + 30, end: 2 * 60 });
    expect(leaveTimeFromWindow(23 * 60 + 30)).toBe(30);
  });
});

describe('first-time setup: battery advice and saved progress', () => {
  it('knows the brands that stop background apps', () => {
    expect(batteryAdvice('Xiaomi')?.brand).toBe('Xiaomi');
    expect(batteryAdvice('POCO')?.brand).toBe('Xiaomi');
    expect(batteryAdvice('OnePlus')?.brand).toBe('OnePlus');
    expect(batteryAdvice('Google')).toBeNull();
    expect(batteryAdvice('motorola')).toBeNull();
  });

  it('saves, loads and clears', async () => {
    const memory = createMemoryStore();
    const store = createSetupStore(memory);
    expect(await store.load()).toEqual(INITIAL_PROGRESS);
    await store.save(progress({ seen: ['welcome'], recording: 'auto' }));
    expect(await store.load()).toMatchObject({ seen: ['welcome'], recording: 'auto' });
    await store.clear();
    expect(memory.dump()[SETUP_KEY]).toBeUndefined();
  });

  it('repairs damaged values instead of failing', async () => {
    expect(sanitize({ closed: 'yes', seen: ['places', 'nonsense', 'places'], recording: 'sometimes' })).toEqual(progress({ seen: ['places'] }));
    expect(await createSetupStore(createMemoryStore({ [SETUP_KEY]: '{not json' })).load()).toEqual(INITIAL_PROGRESS);
  });
});
