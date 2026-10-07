/**
 * MYCE's only server code: receives commute times people chose to share, and deletes them on request.
 * Nothing here can read data back out; analysis happens in BigQuery.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { logger } from 'firebase-functions';
import { onRequest, Request } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { LOCATION, ensureSchema, purgeDeleted, requestDeletion, storeTrips } from './store';
import { checkUpload, isInstallId } from './trips';

initializeApp();

/** The app's web view (Capacitor on Android) and local development. */
const CORS = ['https://localhost', 'http://localhost', /^http:\/\/localhost:\d+$/];

const options = { region: LOCATION, cors: CORS, invoker: 'public', memory: '256MiB', maxInstances: 5, timeoutSeconds: 30 } as const;

const enforceAppCheck = () => process.env.ENFORCE_APP_CHECK === 'true';

/** What App Check says about the caller. Each stored row keeps this, so analysis can use only verified data. */
async function appCheckStatus(request: Request): Promise<'valid' | 'invalid' | 'missing'> {
  const token = request.header('X-Firebase-AppCheck');
  if (!token) return 'missing';
  try {
    await getAppCheck().verifyToken(token);
    return 'valid';
  } catch {
    return 'invalid';
  }
}

/** A soft per-install limit on each server instance; a commuter makes a handful of trips a day. */
const DAILY_LIMIT = 300;
const counts = new Map<string, number>();
let countsDay = '';

function overLimit(installId: string, items: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== countsDay) {
    counts.clear();
    countsDay = today;
  }
  const total = (counts.get(installId) ?? 0) + items;
  counts.set(installId, total);
  return total > DAILY_LIMIT;
}

export const shareTrips = onRequest(options, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('POST only');
    return;
  }
  const checked = checkUpload(request.body, Date.now());
  if (!checked) {
    response.status(400).send('Malformed upload');
    return;
  }
  const appCheck = await appCheckStatus(request);
  if (appCheck !== 'valid' && enforceAppCheck()) {
    response.status(401).send('App Check failed');
    return;
  }
  if (overLimit(checked.installId, checked.trips.length + checked.deleted.length)) {
    response.status(429).send('Too many trips today');
    return;
  }
  if (checked.refused.length > 0) logger.warn('Refused trips', { count: checked.refused.length, reasons: checked.refused.slice(0, 10) });
  try {
    await ensureSchema();
    await storeTrips(checked.installId, checked.appVersion, appCheck, checked.trips, checked.deleted);
  } catch (error) {
    logger.error('Storing trips failed', error);
    response.status(503).send('Try again later');
    return;
  }
  // Refused trips count as received, so the app doesn't send them again and again.
  response.json({ stored: checked.trips.length, deleted: checked.deleted.length, refused: checked.refused.length });
});

export const deleteSharedTrips = onRequest(options, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('POST only');
    return;
  }
  const installId = (request.body as { installId?: unknown } | undefined)?.installId;
  if (!isInstallId(installId)) {
    response.status(400).send('Malformed request');
    return;
  }
  // Deleting is allowed even without App Check: the worst a stranger could do is delete data they can't see.
  try {
    await ensureSchema();
    await requestDeletion(installId);
  } catch (error) {
    logger.error('Deletion request failed', error);
    response.status(503).send('Try again later');
    return;
  }
  response.json({ deleted: true });
});

/** Every night: physically removes what "Delete" and deleted trips have already hidden. */
export const purgeDeletedTrips = onSchedule({ schedule: 'every day 03:30', timeZone: 'Asia/Kolkata', region: LOCATION, timeoutSeconds: 300 }, async () => {
  await ensureSchema();
  const removed = await purgeDeleted();
  logger.info('Purged deleted trips', { rows: removed });
});
