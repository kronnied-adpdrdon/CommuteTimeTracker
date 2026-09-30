import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './kv';

describe('createSerialQueue', () => {
  it('runs tasks one at a time, in order', async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    const task = (name: string, ms: number) => () =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          log.push(name);
          resolve();
        }, ms),
      );
    await Promise.all([enqueue(task('slow', 20)), enqueue(task('fast', 1))]);
    expect(log).toEqual(['slow', 'fast']);
  });

  it('a failed task does not block the next one', async () => {
    const enqueue = createSerialQueue();
    const failed = enqueue(async () => {
      throw new Error('boom');
    });
    await expect(failed).rejects.toThrow('boom');
    await expect(enqueue(async () => 'ok')).resolves.toBe('ok');
  });
});
