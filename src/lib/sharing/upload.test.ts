import { describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from '../storage/kv';
import { DEFAULT_SHARING_SETTINGS, SHARING_KEY, createSharingSettingsStore, sanitize } from './settings';
import { UploadError, createSharingClient } from './upload';

const plan = { upserts: [], deletions: ['gone'] };

describe('createSharingClient', () => {
  it('posts the batch with the App Check token', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const client = createSharingClient({ fetch, appCheckToken: async () => 'tok', baseUrl: 'https://x' });
    await client.upload('id-1', '1.2', plan);
    expect(fetch).toHaveBeenCalledWith('https://x/shareTrips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': 'tok' },
      body: JSON.stringify({ installId: 'id-1', appVersion: '1.2', trips: [], deleted: ['gone'] }),
    });
  });

  it('still sends without a token, and leaves the decision to the server', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('{}', { status: 200 }));
    const client = createSharingClient({ fetch, appCheckToken: async () => { throw new Error('no Play services'); }, baseUrl: 'https://x' });
    await client.deleteAll('id-1');
    expect(fetch.mock.calls[0][1]?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('fails on a server error or no connection, so the batch is tried again later', async () => {
    const refused = createSharingClient({ fetch: async () => new Response('', { status: 503 }), appCheckToken: async () => null });
    await expect(refused.upload('id', '1', plan)).rejects.toBeInstanceOf(UploadError);
    const offline = createSharingClient({ fetch: async () => { throw new TypeError('Failed to fetch'); }, appCheckToken: async () => null });
    await expect(offline.deleteAll('id')).rejects.toBeInstanceOf(UploadError);
  });
});

describe('sharing settings', () => {
  it('starts unanswered, so nothing is shared until the user chooses', async () => {
    expect(await createSharingSettingsStore(createMemoryStore()).load()).toEqual(DEFAULT_SHARING_SETTINGS);
  });

  it('drops anything malformed', () => {
    expect(sanitize({ usage: 'yes', commute: true, commuteSince: 'x', installId: 'not-a-uuid', sent: { a: 'p', b: 3 } })).toEqual({
      usage: null,
      commute: true,
      commuteSince: null,
      installId: null,
      sent: { a: 'p' },
    });
  });

  it('round-trips through storage', async () => {
    const memory = createMemoryStore();
    const store = createSharingSettingsStore(memory);
    const settings = { usage: false, commute: true, commuteSince: 5, installId: '0b8f7a52-6a0e-4d3e-9a51-2c1f6f0b7c11', sent: { a: 'p' } };
    await store.save(settings);
    expect(JSON.parse(memory.dump()[SHARING_KEY])).toEqual(settings);
    expect(await store.load()).toEqual(settings);
  });
});
