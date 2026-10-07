import { BigQuery, TableField } from '@google-cloud/bigquery';
import { createHash } from 'node:crypto';
import { SharedTrip } from './trips';

/** Mumbai, next to the Google Analytics export, so the two can be queried together. */
export const LOCATION = 'asia-south1';
export const DATASET = 'myce';
const TRIPS = 'shared_trips';
const DELETIONS = 'deletion_requests';
const CURRENT = 'trips_current';
/** Raw records are kept 24 months from when they arrived, then BigQuery deletes them. */
const KEEP_MS = 730 * 24 * 60 * 60 * 1000;

// Named explicitly: left to itself the client resolves the project lazily, after the first table name is built.
const bigquery = new BigQuery({ projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT });
const dataset = bigquery.dataset(DATASET, { location: LOCATION });

const TRIP_FIELDS: TableField[] = [
  { name: 'install_id', type: 'STRING', mode: 'REQUIRED', description: 'Random ID made on the phone; not linked to any account' },
  { name: 'trip_id', type: 'STRING', mode: 'REQUIRED', description: 'Random trip ID; a later row with the same ID replaces it' },
  { name: 'received_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'deleted', type: 'BOOL', mode: 'REQUIRED', description: 'The trip was deleted on the phone' },
  { name: 'app_version', type: 'STRING' },
  { name: 'app_check', type: 'STRING', description: 'valid / invalid / missing' },
  { name: 'trip_date', type: 'DATE', description: "Phone's local date" },
  { name: 'start_slot', type: 'INT64', description: 'Local start time, minutes after midnight, rounded down to 15' },
  { name: 'weekday', type: 'INT64', description: '0 = Sunday' },
  { name: 'duration_seconds', type: 'INT64' },
  { name: 'distance_km', type: 'FLOAT64' },
  { name: 'direction', type: 'STRING', description: 'work / home / other' },
  { name: 'auto', type: 'BOOL', description: 'Started and stopped automatically' },
  { name: 'edited', type: 'BOOL', description: 'Edited by the user' },
  { name: 'from_cell', type: 'STRING', description: 'Geohash, 5 characters (~4.9 km)' },
  { name: 'to_cell', type: 'STRING', description: 'Geohash, 5 characters (~4.9 km)' },
];

const DELETION_FIELDS: TableField[] = [
  { name: 'install_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'requested_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
];

const table = (name: string) => `\`${bigquery.projectId}.${DATASET}.${name}\``;

/** The latest copy of each trip, without deleted trips or anything from installs that asked for deletion. */
const currentTripsQuery = () => `
SELECT * EXCEPT (row_rank, deleted)
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY install_id, trip_id ORDER BY received_at DESC) AS row_rank
  FROM ${table(TRIPS)}
)
WHERE row_rank = 1
  AND NOT deleted
  AND install_id NOT IN (SELECT install_id FROM ${table(DELETIONS)})`;

let ready: Promise<void> | null = null;

/** Creates the dataset, tables and view the first time; afterwards a no-op. */
export function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    await dataset.get({ autoCreate: true });
    const create = async (name: string, options: object) => {
      const [exists] = await dataset.table(name).exists();
      if (!exists) await dataset.createTable(name, options);
    };
    await create(TRIPS, {
      schema: { fields: TRIP_FIELDS },
      timePartitioning: { type: 'DAY', field: 'received_at', expirationMs: String(KEEP_MS) },
      clustering: { fields: ['install_id'] },
      description: 'Commute times shared from MYCE (opt-in). Each row is deleted 24 months after it arrived.',
    });
    await create(DELETIONS, {
      schema: { fields: DELETION_FIELDS },
      timePartitioning: { type: 'DAY', field: 'requested_at', expirationMs: String(KEEP_MS) },
      description: '"Delete commute times I\'ve shared" requests. Hidden at once by trips_current, removed daily.',
    });
    await create(CURRENT, { view: { query: currentTripsQuery(), useLegacySql: false } });
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

const rowId = (parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32);

export async function storeTrips(installId: string, appVersion: string, appCheck: string, trips: SharedTrip[], deleted: string[]): Promise<void> {
  const receivedAt = new Date().toISOString();
  const base = { install_id: installId, received_at: receivedAt, app_version: appVersion, app_check: appCheck };
  const rows = [
    ...trips.map((t) => ({
      // Same content sent twice (a retry) is stored once.
      insertId: rowId([installId, t]),
      json: {
        ...base,
        trip_id: t.tripId,
        deleted: false,
        trip_date: t.date,
        start_slot: t.startSlot,
        weekday: t.weekday,
        duration_seconds: t.durationSeconds,
        distance_km: t.distanceKm,
        direction: t.direction,
        auto: t.auto,
        edited: t.edited,
        from_cell: t.fromCell,
        to_cell: t.toCell,
      },
    })),
    ...deleted.map((tripId) => ({ insertId: rowId([installId, tripId, 'deleted']), json: { ...base, trip_id: tripId, deleted: true } })),
  ];
  if (rows.length > 0) await dataset.table(TRIPS).insert(rows, { raw: true });
}

export async function requestDeletion(installId: string): Promise<void> {
  await dataset.table(DELETIONS).insert([{ insertId: rowId([installId, 'delete-all']), json: { install_id: installId, requested_at: new Date().toISOString() } }], { raw: true });
}

/**
 * Removes for good what the view already hides: everything from installs that asked for deletion, and every copy
 * of trips deleted on the phone. Skips the last 3 hours, which BigQuery can't change yet (streaming buffer);
 * the next run gets them.
 */
export async function purgeDeleted(): Promise<number> {
  const settled = 'received_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 HOUR)';
  const query = `
DELETE FROM ${table(TRIPS)}
WHERE ${settled}
  AND (
    install_id IN (SELECT install_id FROM ${table(DELETIONS)})
    OR STRUCT(install_id, trip_id) IN (SELECT AS STRUCT install_id, trip_id FROM ${table(TRIPS)} WHERE deleted AND ${settled})
  )`;
  const [job] = await bigquery.createQueryJob({ query, location: LOCATION });
  await job.getQueryResults();
  const [metadata] = await job.getMetadata();
  return Number(metadata.statistics?.query?.numDmlAffectedRows ?? 0);
}
