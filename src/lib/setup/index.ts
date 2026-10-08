'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { autoTracking } from '../auto';
import { commute } from '../commute';
import { isNativeApp, lazyPlugin } from '../native';
import { notifications } from '../notifications';
import { sharing, track } from '../sharing';
import { KeyValueStore } from '../storage/kv';
import { ChecklistItem, INITIAL_PROGRESS, SetupFacts, SetupProgress, SetupStep, createSetupStore, itemApplies, wizardSteps } from './logic';

interface BatteryPlugin {
  checkBattery(): Promise<{ manufacturer: string; unrestricted: boolean }>;
}

/** The battery check lives on the automatic start and stop plugin, which already deals with background work. */
const plugin = lazyPlugin<BatteryPlugin>('AutoTracking');

const preferences: KeyValueStore = {
  get: async (key) => (await import('../storage/preferences')).preferencesStore.get(key),
  set: async (key, value) => (await import('../storage/preferences')).preferencesStore.set(key, value),
  remove: async (key) => (await import('../storage/preferences')).preferencesStore.remove(key),
};

const store = createSetupStore(preferences);

export interface SetupWizard {
  steps: SetupStep[];
  index: number;
  /** Opened from the Home card for one item: closes after it instead of showing "All set". */
  single: boolean;
  /** Which way the last move went, so the next screen slides in from the right side. */
  direction: 'forward' | 'back';
}

export interface SetupState {
  progress: SetupProgress;
  /** Everything the decisions need has loaded (trips, places, permissions, the phone's maker). */
  loaded: boolean;
  manufacturer: string;
  batteryUnrestricted: boolean | null;
  /** The open pop-up, or null. */
  wizard: SetupWizard | null;
}

const INITIAL: SetupState = { progress: INITIAL_PROGRESS, loaded: false, manufacturer: '', batteryUnrestricted: null, wizard: null };

let state = INITIAL;
const listeners = new Set<() => void>();
const set = (patch: Partial<SetupState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

/** What the rest of the app knows right now. */
export function currentFacts(): SetupFacts {
  const app = commute.getState();
  const placesSet = Boolean(app.places.home && app.places.office);
  return {
    isNewUser: app.trips.length === 0 && !app.places.home && !app.places.office,
    placesSet,
    placesNeverAsk: app.placesPromptNeverAsk,
    autoEnabled: autoTracking.getState().settings.enabled,
    notificationsAllowed: notifications.getState().allowed,
    manufacturer: state.manufacturer,
    batteryUnrestricted: state.batteryUnrestricted,
    usageAnswered: sharing.getState().settings.usage !== null,
  };
}

async function refreshBattery(): Promise<void> {
  try {
    if (!(await isNativeApp())) return;
    const status = await (await plugin()).native.checkBattery();
    set({ manufacturer: status.manufacturer, batteryUnrestricted: status.unrestricted });
  } catch {
    // Leave unknown.
  }
}

async function save(patch: Partial<SetupProgress>): Promise<void> {
  const progress = { ...state.progress, ...patch };
  set({ progress });
  await store.save(progress);
}

function openIfNeeded(): void {
  // Don't cover the Save / Discard choice for a trip that was cut off.
  if (commute.getState().phase === 'interrupted') return;
  const steps = wizardSteps(state.progress, currentFacts());
  if (steps.length > 0) set({ wizard: { steps, index: 0, single: false, direction: 'forward' } });
  // Nothing to ask (e.g. a tester who set everything up before this existed): later changes go to the Home card instead.
  else if (!state.progress.closed) void save({ closed: true });
}

let started: Promise<void> | null = null;

function start(): Promise<void> {
  started ??= (async () => {
    const progress = await store.load();
    set({ progress });
    await Promise.all([commute.init(), autoTracking.start(), notifications.start(), sharing.start(), refreshBattery()]);
    set({ loaded: true });
    openIfNeeded();
    document.addEventListener('visibilitychange', () => {
      // Back from the phone's settings: the battery setting may have changed.
      if (document.visibilityState === 'visible') void refreshBattery();
    });
  })();
  return started;
}

/** Each Home card item opens these screens. */
const ITEM_STEPS: Record<ChecklistItem, SetupStep[]> = {
  places: ['places'],
  recording: ['times', 'recording'],
  reminders: ['reminders'],
  battery: ['battery'],
};

export const setup = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  start,
  /** Saves an answer (recording, reminders, battery). */
  answer: (patch: Pick<Partial<SetupProgress>, 'recording' | 'reminders' | 'battery'>) => save(patch),
  /** Moves past the current screen, answered or skipped. Past the last one, the pop-up closes. */
  async next(action: 'next' | 'skip' = 'next') {
    const wizard = state.wizard;
    if (!wizard) return;
    const step = wizard.steps[wizard.index];
    track(step === 'done' ? { name: 'setup_complete' } : { name: 'setup_step', params: { step, action } });
    const seen = state.progress.seen.includes(step) ? state.progress.seen : [...state.progress.seen, step];
    const last = wizard.index >= wizard.steps.length - 1;
    set({ wizard: last ? null : { ...wizard, index: wizard.index + 1, direction: 'forward' } });
    await save({ seen, closed: state.progress.closed || (last && !wizard.single) });
  },
  async back() {
    const wizard = state.wizard;
    if (wizard && wizard.index > 0) set({ wizard: { ...wizard, index: wizard.index - 1, direction: 'back' } });
  },
  /** Jumps to a screen the user needs first (e.g. Home and Office before automatic start and stop). */
  goTo(step: SetupStep) {
    const wizard = state.wizard;
    if (!wizard) return;
    const at = wizard.steps.indexOf(step);
    if (at >= 0) set({ wizard: { ...wizard, index: at, direction: 'back' } });
    else set({ wizard: { ...wizard, steps: [...wizard.steps.slice(0, wizard.index), step, ...wizard.steps.slice(wizard.index)], direction: 'back' } });
  },
  /** Closes a single item opened from the Home card. The full setup has no way out but through its screens. */
  close() {
    set({ wizard: null });
  },
  /** From the Home card. */
  openItem(item: ChecklistItem) {
    set({ wizard: { steps: ITEM_STEPS[item], index: 0, single: true, direction: 'forward' } });
  },
  hideChecklist: () => save({ checklistHidden: true }),
  /** Developer tools: forget all progress and show every screen, even ones already done on this phone. */
  async preview() {
    await store.clear();
    const battery: SetupStep[] = itemApplies('battery', currentFacts()) ? ['battery'] : [];
    set({ progress: INITIAL_PROGRESS, wizard: { steps: ['welcome', 'usage', 'places', 'times', 'recording', 'reminders', ...battery, 'done'], index: 0, single: false, direction: 'forward' } });
  },
  refreshBattery,
};

export function useSetup(): SetupState {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(setup.subscribe, setup.getState, () => INITIAL);
}
