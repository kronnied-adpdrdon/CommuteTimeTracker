import { KeyValueStore } from '../storage/kv';

export const SETUP_KEY = 'setup.v1';

/** The first-time setup's screens, in order. "welcome" is for new users only; "done" closes the flow. */
export type SetupStep = 'welcome' | 'places' | 'times' | 'recording' | 'reminders' | 'battery' | 'done';

/** What the "Finish setting up" card on Home lists. Commute times live inside the recording choice. */
export type ChecklistItem = 'places' | 'recording' | 'reminders' | 'battery';

export interface SetupProgress {
  /** Finished or closed: the setup no longer opens by itself, and the Home card takes over. */
  closed: boolean;
  /** Steps the user has moved past, answered or skipped, so reopening the app resumes where they stopped. */
  seen: SetupStep[];
  recording?: 'auto' | 'manual';
  reminders?: 'on' | 'off';
  /** The user said they changed the battery setting. Some phones (Xiaomi's Autostart) can't be read back. */
  battery?: 'done';
  /** "Hide" on the Home card. */
  checklistHidden: boolean;
}

export const INITIAL_PROGRESS: SetupProgress = { closed: false, seen: [], checklistHidden: false };

/** What the rest of the app knows, gathered once everything has loaded. */
export interface SetupFacts {
  /** No trips and no addresses: show the welcome screen. */
  isNewUser: boolean;
  placesSet: boolean;
  /** "Don't ask again" on the old Home/Office pop-up: don't ask in the setup either. */
  placesNeverAsk: boolean;
  autoEnabled: boolean;
  /** Null when unknown (a browser), which counts as fine: there is nothing to ask. */
  notificationsAllowed: boolean | null;
  /** The phone's maker, e.g. "Xiaomi". Empty in a browser. */
  manufacturer: string;
  /** Android's "Unrestricted" battery setting for this app. Null when unknown. */
  batteryUnrestricted: boolean | null;
}

const STEPS: SetupStep[] = ['welcome', 'places', 'times', 'recording', 'reminders', 'battery', 'done'];

export function sanitize(value: unknown): SetupProgress {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const seen = Array.isArray(input.seen) ? [...new Set(input.seen.filter((s): s is SetupStep => STEPS.includes(s as SetupStep)))] : [];
  return {
    closed: input.closed === true,
    seen,
    recording: input.recording === 'auto' || input.recording === 'manual' ? input.recording : undefined,
    reminders: input.reminders === 'on' || input.reminders === 'off' ? input.reminders : undefined,
    battery: input.battery === 'done' ? 'done' : undefined,
    checklistHidden: input.checklistHidden === true,
  };
}

export interface SetupStore {
  load(): Promise<SetupProgress>;
  save(progress: SetupProgress): Promise<void>;
  clear(): Promise<void>;
}

export function createSetupStore(store: KeyValueStore): SetupStore {
  return {
    async load() {
      const raw = await store.get(SETUP_KEY);
      if (raw === null) return INITIAL_PROGRESS;
      try {
        return sanitize(JSON.parse(raw));
      } catch {
        return INITIAL_PROGRESS;
      }
    },
    save: (progress) => store.set(SETUP_KEY, JSON.stringify(progress)),
    clear: () => store.remove(SETUP_KEY),
  };
}

/** Phone makers known to stop apps in the background to save battery (see dontkillmyapp.com). */
const BATTERY_ADVICE: { makers: string[]; name: string; advice: string; readable: boolean }[] = [
  { makers: ['xiaomi', 'redmi', 'poco'], name: 'Xiaomi', advice: 'Turn on Autostart, then open Battery saver and choose "No restrictions".', readable: false },
  { makers: ['samsung'], name: 'Samsung', advice: 'Tap Battery and choose "Unrestricted". Also check the app isn\'t listed under "Sleeping apps" in Battery settings.', readable: true },
  { makers: ['oneplus', 'oppo', 'realme'], name: '', advice: 'Tap Battery usage, then allow background activity and auto launch.', readable: false },
  { makers: ['vivo', 'iqoo'], name: '', advice: 'Tap Battery and allow high background power use.', readable: false },
  { makers: ['huawei', 'honor'], name: '', advice: 'Tap Battery, then App launch, and switch this app to "Manage manually" with everything on.', readable: false },
  { makers: ['meizu', 'asus', 'nokia', 'hmd global', 'lenovo', 'tecno', 'infinix', 'itel'], name: '', advice: 'Tap Battery and choose "Unrestricted" or "Don\'t optimise".', readable: true },
];

export interface BatteryAdvice {
  /** For the heading, e.g. "Xiaomi". */
  brand: string;
  /** What to change on the app's settings page. */
  advice: string;
  /**
   * Whether Android's "Unrestricted" setting is the whole story. On Xiaomi, OnePlus, vivo and Huawei the maker's
   * own switches (Autostart, auto launch) matter too and can't be read, so only the user can say it's done.
   */
  readable: boolean;
}

/** Advice for phones that stop background apps; null for phones that don't need it (Pixel, Motorola, ...). */
export function batteryAdvice(manufacturer: string): BatteryAdvice | null {
  const maker = manufacturer.trim().toLowerCase();
  const match = BATTERY_ADVICE.find((entry) => entry.makers.includes(maker));
  if (!match) return null;
  const brand = match.name || manufacturer.trim().replace(/^\w/, (c) => c.toUpperCase());
  return { brand, advice: match.advice, readable: match.readable };
}

/** Whether a checklist item applies to this phone at all. Only the battery step depends on the phone. */
export function itemApplies(item: ChecklistItem, facts: SetupFacts): boolean {
  return item !== 'battery' || batteryAdvice(facts.manufacturer) !== null;
}

/** Done means set up or deliberately declined. Skipped items stay open on the Home card. */
export function itemDone(item: ChecklistItem, progress: SetupProgress, facts: SetupFacts): boolean {
  switch (item) {
    case 'places':
      return facts.placesSet;
    case 'recording':
      return facts.autoEnabled || progress.recording === 'manual';
    case 'reminders':
      // Older Android allows notifications without asking, and reminders are on by default, so there's nothing to do.
      return progress.reminders === 'off' || facts.notificationsAllowed !== false;
    case 'battery': {
      const advice = batteryAdvice(facts.manufacturer);
      return advice === null || progress.battery === 'done' || (advice.readable && facts.batteryUnrestricted === true);
    }
  }
}

const CHECKLIST: ChecklistItem[] = ['places', 'recording', 'reminders', 'battery'];

export function checklist(progress: SetupProgress, facts: SetupFacts): { item: ChecklistItem; done: boolean }[] {
  return CHECKLIST.filter((item) => itemApplies(item, facts)).map((item) => ({ item, done: itemDone(item, progress, facts) }));
}

/**
 * The screens to show when the app opens. Steps already done or already moved past are left out, so an
 * update shows existing users only what's new to them, and a setup closed halfway resumes where it stopped.
 */
export function wizardSteps(progress: SetupProgress, facts: SetupFacts): SetupStep[] {
  if (progress.closed) return [];
  const seen = (step: SetupStep) => progress.seen.includes(step);
  const open = (item: ChecklistItem) => itemApplies(item, facts) && !itemDone(item, progress, facts);
  const steps: SetupStep[] = [];
  if (facts.isNewUser && !seen('welcome')) steps.push('welcome');
  if (open('places') && !seen('places') && !facts.placesNeverAsk) steps.push('places');
  if (open('recording') && !seen('recording')) {
    if (!seen('times')) steps.push('times');
    steps.push('recording');
  }
  if (open('reminders') && !seen('reminders')) steps.push('reminders');
  if (open('battery') && !seen('battery')) steps.push('battery');
  // Only the welcome left (e.g. reopened after the first screen) isn't worth a pop-up on its own.
  if (steps.length === 0 || (steps.length === 1 && steps[0] === 'welcome')) return [];
  return [...steps, 'done'];
}

/** Commute hours from "when do you usually leave": an hour before to 90 minutes after (people run late more than early). */
export const WINDOW_BEFORE_MINUTES = 60;
export const WINDOW_AFTER_MINUTES = 90;
const DAY = 24 * 60;

export function windowFromLeaveTime(minutes: number): { start: number; end: number } {
  return { start: (minutes - WINDOW_BEFORE_MINUTES + DAY) % DAY, end: (minutes + WINDOW_AFTER_MINUTES) % DAY };
}

/** The reverse, to prefill the question from the saved hours. */
export function leaveTimeFromWindow(start: number): number {
  return (start + WINDOW_BEFORE_MINUTES) % DAY;
}
