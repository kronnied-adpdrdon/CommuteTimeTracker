import { SharedTrip, SyncPlan } from './records';

/** Where shared commute stats go: two small Cloud Functions in Mumbai. Override with NEXT_PUBLIC_SHARING_URL to test. */
export const SHARING_URL = process.env.NEXT_PUBLIC_SHARING_URL || 'https://asia-south1-myce-3da63.cloudfunctions.net';

/** Must match `functions/src/index.ts`. */
export interface UploadBody {
  installId: string;
  appVersion: string;
  trips: SharedTrip[];
  deleted: string[];
}

export interface SharingClientDeps {
  fetch: typeof fetch;
  /** Proves the request comes from the real app. Null when there's no token (it is then up to the server). */
  appCheckToken: () => Promise<string | null>;
  baseUrl?: string;
}

export class UploadError extends Error {}

export interface SharingClient {
  /** Sends one plan. Resolves once the server has stored it; throws `UploadError` otherwise (try again later). */
  upload(installId: string, appVersion: string, plan: SyncPlan): Promise<void>;
  /** Asks the server to delete everything shared under this install ID. */
  deleteAll(installId: string): Promise<void>;
}

export function createSharingClient(deps: SharingClientDeps): SharingClient {
  const base = deps.baseUrl ?? SHARING_URL;

  async function post(path: string, body: unknown): Promise<void> {
    const token = await deps.appCheckToken().catch(() => null);
    let response: Response;
    try {
      response = await deps.fetch(`${base}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Firebase-AppCheck': token } : {}) },
        body: JSON.stringify(body),
      });
    } catch {
      throw new UploadError('No connection');
    }
    if (!response.ok) throw new UploadError(`Server said ${response.status}`);
  }

  return {
    upload: (installId, appVersion, plan) =>
      post('shareTrips', { installId, appVersion, trips: plan.upserts, deleted: plan.deletions } satisfies UploadBody),
    deleteAll: (installId) => post('deleteSharedTrips', { installId }),
  };
}
