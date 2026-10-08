import { KeyValueStore } from '../storage/kv';
import { SentLog } from './records';

export const SHARING_KEY = 'sharing.v1';

/**
 * The two "Help improve MYCE" choices. Null means never asked: nothing is collected or sent until the user
 * says yes, and off is as easy to choose as on.
 */
export interface SharingSettings {
  /** "Share how you use the app": app-usage statistics through Firebase Analytics. */
  usage: boolean | null;
  /** "Share commute times": coarse trip records, see `SharedTrip`. */
  commute: boolean | null;
  /** When commute sharing was last turned on. Only trips that started after this are shared. */
  commuteSince: number | null;
  /** Random, made on the phone, not linked to any account. A new one each time commute sharing is turned on. */
  installId: string | null;
  /**
   * Commute sharing was turned off, so everything shared under this ID must be deleted; kept until the server
   * confirms (retried when the app opens or comes back online).
   */
  pendingDelete: string | null;
  /** What has been sent, so edits and deletions follow and nothing is sent twice. */
  sent: SentLog;
}

export const DEFAULT_SHARING_SETTINGS: SharingSettings = { usage: null, commute: null, commuteSince: null, installId: null, pendingDelete: null, sent: {} };

const choice = (value: unknown) => (typeof value === 'boolean' ? value : null);
const uuidOrNull = (value: unknown) => (typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value) ? value : null);

export function sanitize(value: unknown): SharingSettings {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const sent: SentLog = {};
  if (input.sent && typeof input.sent === 'object') {
    for (const [id, print] of Object.entries(input.sent as Record<string, unknown>)) if (typeof print === 'string') sent[id] = print;
  }
  return {
    usage: choice(input.usage),
    commute: choice(input.commute),
    commuteSince: typeof input.commuteSince === 'number' && Number.isFinite(input.commuteSince) ? input.commuteSince : null,
    installId: uuidOrNull(input.installId),
    pendingDelete: uuidOrNull(input.pendingDelete),
    sent,
  };
}

export interface SharingSettingsStore {
  load(): Promise<SharingSettings>;
  save(settings: SharingSettings): Promise<void>;
}

export function createSharingSettingsStore(store: KeyValueStore): SharingSettingsStore {
  return {
    async load() {
      const raw = await store.get(SHARING_KEY);
      if (raw === null) return DEFAULT_SHARING_SETTINGS;
      try {
        return sanitize(JSON.parse(raw));
      } catch {
        return DEFAULT_SHARING_SETTINGS;
      }
    },
    save: (settings) => store.set(SHARING_KEY, JSON.stringify(settings)),
  };
}
