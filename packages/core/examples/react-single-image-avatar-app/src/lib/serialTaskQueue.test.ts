import { describe, expect, it } from 'vitest';
import { createSerialTaskQueue } from './serialTaskQueue';

describe('createSerialTaskQueue', () => {
  it('runs overlapping tasks in request order', async () => {
    const enqueue = createSerialTaskQueue();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = enqueue(async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
    });
    const second = enqueue(async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual([
      'first:start',
      'first:end',
      'second:start',
      'second:end',
    ]);
  });

  it('continues after a rejected task', async () => {
    const enqueue = createSerialTaskQueue();
    const first = enqueue(async () => {
      throw new Error('expected failure');
    });
    const second = enqueue(async () => 'completed');

    await expect(first).rejects.toThrow('expected failure');
    await expect(second).resolves.toBe('completed');
  });
});
