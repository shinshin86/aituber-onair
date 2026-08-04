import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KizunaManager } from '../src/KizunaManager';
import { createDefaultKizunaConfig } from '../src/defaultConfig';
import type {
  Interaction,
  KizunaConfig,
  KizunaEventType,
  StorageProvider,
  Threshold,
} from '../src/types';

const createConfig = (
  thresholds: Threshold[] = [],
  basePoints = 1,
  overrides: Partial<KizunaConfig> = {},
): KizunaConfig => ({
  ...createDefaultKizunaConfig(),
  ...overrides,
  basePoints: { message: basePoints },
  rules: [],
  thresholds,
});

const createInteraction = (
  overrides: Partial<Interaction> = {},
): Interaction => ({
  userId: 'user-1',
  kind: 'message',
  message: 'Hello',
  emotion: 'happy',
  isOwner: false,
  timestamp: Date.now(),
  ...overrides,
});

const createManager = (
  thresholds: Threshold[] = [],
  basePoints = 1,
  overrides: Partial<KizunaConfig> = {},
): KizunaManager =>
  new KizunaManager(
    createConfig(thresholds, basePoints, overrides),
    undefined,
    'kizuna-test',
  );

const createMemoryStorage = (): StorageProvider => {
  const values = new Map<string, string>();
  return {
    async save(key, data) {
      values.set(key, JSON.stringify(data));
    },
    async load<T>(key: string): Promise<T | null> {
      const value = values.get(key);
      return value ? (JSON.parse(value) as T) : null;
    },
    async remove(key) {
      values.delete(key);
    },
    async getAllKeys() {
      return Array.from(values.keys());
    },
    async clear() {
      values.clear();
    },
  };
};

describe('KizunaManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('updates activity, emotions, continuity, and interaction history', async () => {
    const manager = createManager();
    await manager.processInteraction(createInteraction());
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    await manager.processInteraction(
      createInteraction({ message: 'Next bucket', emotion: 'calm' }),
    );

    const user = manager.getUser('user-1');
    expect(user?.stats).toMatchObject({
      totalInteractions: 2,
      totalPointsEarned: 2,
      continuity: { streak: 2, totalActiveBuckets: 2 },
      favoriteEmotions: { happy: 1, calm: 1 },
    });
    expect(user?.stats.interactionHistory).toHaveLength(2);
    expect(user?.stats.interactionHistory?.[1]).toMatchObject({
      points: 1,
      message: 'Next bucket',
      emotion: 'calm',
      kind: 'message',
      appliedRules: [],
    });
  });

  it('keeps only the latest 100 interaction records', async () => {
    const manager = createManager();
    for (let index = 0; index < 101; index++) {
      await manager.processInteraction(
        createInteraction({ message: `Message ${index}` }),
      );
    }
    const history = manager.getUser('user-1')?.stats.interactionHistory;
    expect(history).toHaveLength(100);
    expect(history?.[0]?.message).toBe('Message 1');
    expect(history?.[99]?.message).toBe('Message 100');
  });

  it('updates the level when points cross a stage boundary', async () => {
    const manager = createManager([], 100);
    const result = await manager.processInteraction(createInteraction());
    expect(result).toMatchObject({
      pointsAdded: 100,
      totalPoints: 100,
      leveledUp: true,
      newLevel: 2,
    });
    expect(manager.getUser('user-1')?.level).toBe(2);
  });

  it('never decreases accumulated points', async () => {
    const manager = createManager();
    await manager.processInteraction(createInteraction());

    const result = await manager.addPoints('user-1', -10);

    expect(result).toMatchObject({ pointsAdded: 0, totalPoints: 1 });
    expect(manager.getUser('user-1')?.points).toBe(1);
  });

  it('ignores non-finite point adjustments', async () => {
    const manager = createManager();
    await manager.processInteraction(createInteraction());

    const result = await manager.addPoints('user-1', Number.NaN);

    expect(result).toMatchObject({ pointsAdded: 0, totalPoints: 1 });
    expect(manager.getUser('user-1')?.points).toBe(1);
  });

  it('does not move contact timestamps backwards', async () => {
    const manager = createManager();
    const latest = Date.UTC(2026, 0, 2, 12);
    await manager.processInteraction(createInteraction({ timestamp: latest }));
    await manager.processInteraction(
      createInteraction({ timestamp: latest - 24 * 60 * 60 * 1_000 }),
    );

    const user = manager.getUser('user-1');
    expect(user?.lastSeen.getTime()).toBe(latest);
    expect(user?.stats.continuity.lastContactAt.getTime()).toBe(latest);
    expect(user?.stats.continuity).toMatchObject({
      streak: 1,
      totalActiveBuckets: 1,
    });
  });

  it('reports aggregate user and point statistics', async () => {
    const manager = createManager();
    await manager.processInteraction(createInteraction());
    await manager.processInteraction(
      createInteraction({ userId: 'owner-1', isOwner: true }),
    );
    expect(manager.getStats()).toEqual({
      totalUsers: 2,
      totalPoints: 2,
      averageLevel: 1,
      ownerUsers: 1,
      activeToday: 2,
    });
  });

  it('fires repeatable thresholds only on each upward crossing', async () => {
    const thresholds: Threshold[] = [
      {
        id: 'once',
        points: 5,
        action: { type: 'special_response', data: { message: 'Once' } },
        repeatable: false,
      },
      {
        id: 'repeat',
        points: 5,
        action: { type: 'custom', data: { name: 'Repeat' } },
        repeatable: true,
      },
    ];
    const config = createConfig(thresholds, 5);
    const storage = createMemoryStorage();
    const manager = new KizunaManager(config, storage, 'kizuna-test');
    const first = await manager.processInteraction(createInteraction());
    const second = await manager.processInteraction(createInteraction());

    expect(first.triggeredActions).toHaveLength(2);
    expect(second.triggeredActions).toEqual([]);
    expect(manager.getUser('user-1')?.triggeredThresholds).toEqual([
      'once',
      'repeat',
    ]);

    const saved = await storage.load<{
      users: Record<string, { points: number }>;
    }>('kizuna-test');
    if (!saved?.users['user-1']) throw new Error('Expected persisted user');
    saved.users['user-1'].points = 0;
    await storage.save('kizuna-test', saved);
    manager.destroy();

    const restored = new KizunaManager(config, storage, 'kizuna-test');
    await restored.initialize();
    const reCrossing = await restored.processInteraction(createInteraction());

    expect(reCrossing.triggeredActions).toHaveLength(1);
    expect(reCrossing.triggeredActions[0]?.type).toBe('custom');
  });

  it('does not mark an invalid achievement action as completed', async () => {
    const threshold: Threshold = {
      id: 'invalid-achievement',
      points: 1,
      action: { type: 'achievement', data: { id: 'incomplete' } },
      repeatable: false,
    };
    const manager = createManager([threshold]);
    const result = await manager.processInteraction(createInteraction());
    expect(result.triggeredActions).toEqual([]);
    expect(manager.getUser('user-1')?.triggeredThresholds).toEqual([]);
    expect(manager.getUser('user-1')?.achievements).toEqual([]);
  });

  it('grants achievements and emits state events in order', async () => {
    const threshold: Threshold = {
      id: 'companion',
      points: 100,
      action: {
        type: 'achievement',
        data: {
          id: 'companion',
          title: 'Companion',
          description: 'Reached companion status',
          icon: '⭐',
        },
      },
      repeatable: false,
    };
    const manager = createManager([threshold], 100);
    const eventOrder: KizunaEventType[] = [];
    const eventTypes: KizunaEventType[] = [
      'user_created',
      'points_updated',
      'level_up',
      'threshold_reached',
      'achievement_earned',
    ];
    for (const eventType of eventTypes) {
      manager.on(eventType, () => eventOrder.push(eventType));
    }
    await manager.processInteraction(createInteraction());
    expect(manager.getUser('user-1')?.achievements).toEqual([
      expect.objectContaining({ id: 'companion', title: 'Companion' }),
    ]);
    expect(eventOrder).toEqual(eventTypes);
  });

  it('restores bond state and non-repeatable threshold tracking', async () => {
    const threshold: Threshold = {
      id: 'first-contact',
      points: 1,
      action: { type: 'custom', data: { name: 'First contact' } },
      repeatable: false,
    };
    const storage = createMemoryStorage();
    const firstManager = new KizunaManager(
      createConfig([threshold]),
      storage,
      'persistence-test',
    );
    await firstManager.processInteraction(createInteraction());
    firstManager.destroy();

    const restoredManager = new KizunaManager(
      createConfig([threshold]),
      storage,
      'persistence-test',
    );
    await restoredManager.initialize();
    const restored = restoredManager.getUser('user-1');
    expect(restored?.firstSeen).toBeInstanceOf(Date);
    expect(restored?.stats.lastPointsEarned).toBeInstanceOf(Date);
    expect(restored?.stats.continuity.lastContactAt).toBeInstanceOf(Date);
    expect(restored?.stats.interactionHistory?.[0]?.timestamp).toBeInstanceOf(
      Date,
    );
    expect(restored?.triggeredThresholds).toEqual(['first-contact']);
    const result = await restoredManager.processInteraction(
      createInteraction(),
    );
    expect(result.triggeredActions).toEqual([]);
    restoredManager.destroy();
  });

  it('does not repeat an owner first-contact bonus after restoration', async () => {
    const storage = createMemoryStorage();
    const firstConfig = createConfig();
    firstConfig.owner.firstContactBonus = 7;
    const firstManager = new KizunaManager(
      firstConfig,
      storage,
      'owner-bonus-test',
    );
    const first = await firstManager.processInteraction(
      createInteraction({ userId: 'owner-1', isOwner: true }),
    );
    expect(first.pointsAdded).toBe(8);
    firstManager.destroy();

    const restoredConfig = createConfig();
    restoredConfig.owner.firstContactBonus = 7;
    const restoredManager = new KizunaManager(
      restoredConfig,
      storage,
      'owner-bonus-test',
    );
    const second = await restoredManager.processInteraction(
      createInteraction({ userId: 'owner-1', isOwner: true }),
    );
    expect(second.pointsAdded).toBe(1);
    restoredManager.destroy();
  });

  it('continues session indexes after restoration', async () => {
    const storage = createMemoryStorage();
    const firstConfig = createConfig();
    firstConfig.continuity = { unit: 'session' };
    const firstManager = new KizunaManager(
      firstConfig,
      storage,
      'session-persistence-test',
    );
    await firstManager.beginSession('one');
    await firstManager.processInteraction(createInteraction());
    firstManager.destroy();

    const restoredConfig = createConfig();
    restoredConfig.continuity = { unit: 'session' };
    const restoredManager = new KizunaManager(
      restoredConfig,
      storage,
      'session-persistence-test',
    );
    await restoredManager.beginSession('two');
    await restoredManager.processInteraction(createInteraction());
    expect(restoredManager.getBondSnapshot('user-1')?.continuity).toMatchObject(
      { streak: 2, totalActiveBuckets: 2 },
    );
    restoredManager.destroy();
  });

  it('persists empty session gaps across restoration', async () => {
    const storage = createMemoryStorage();
    const firstConfig = createConfig();
    firstConfig.continuity = { unit: 'session' };
    const firstManager = new KizunaManager(
      firstConfig,
      storage,
      'empty-session-gap-test',
    );
    await firstManager.beginSession('one');
    await firstManager.processInteraction(createInteraction());
    firstManager.endSession();
    await firstManager.beginSession('empty');
    firstManager.endSession();
    firstManager.destroy();

    const restoredConfig = createConfig();
    restoredConfig.continuity = { unit: 'session' };
    const restoredManager = new KizunaManager(
      restoredConfig,
      storage,
      'empty-session-gap-test',
    );
    await restoredManager.beginSession('three');
    await restoredManager.processInteraction(createInteraction());

    expect(restoredManager.getBondSnapshot('user-1')?.continuity).toMatchObject(
      { streak: 1, totalActiveBuckets: 2 },
    );
    restoredManager.destroy();
  });

  it('returns the created session ID when the session ends during save', async () => {
    let releaseSave: () => void = () => undefined;
    let notifySave: () => void = () => undefined;
    const saveStarted = new Promise<void>((resolve) => {
      notifySave = resolve;
    });
    const pendingSave = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const storage: StorageProvider = {
      async save() {
        notifySave();
        await pendingSave;
      },
      async load<T>(): Promise<T | null> {
        return null;
      },
      async remove() {},
      async getAllKeys() {
        return [];
      },
      async clear() {},
    };
    const config = createConfig();
    config.continuity = { unit: 'session' };
    const manager = new KizunaManager(config, storage, 'session-race-test');

    const session = manager.beginSession('one');
    await saveStarted;
    manager.endSession();
    releaseSave();

    await expect(session).resolves.toBe('one');
    manager.destroy();
  });

  it('persists rule limits across restoration', async () => {
    const storage = createMemoryStorage();
    const rule: KizunaConfig['rules'][number] = {
      id: 'once-per-bucket',
      name: 'Once per bucket',
      condition: () => true,
      points: 5,
      bucketLimit: 1,
    };
    const firstConfig = createConfig();
    firstConfig.rules = [rule];
    const firstManager = new KizunaManager(
      firstConfig,
      storage,
      'rule-limit-test',
    );
    expect(
      (await firstManager.processInteraction(createInteraction())).pointsAdded,
    ).toBe(6);
    firstManager.destroy();

    const restoredConfig = createConfig();
    restoredConfig.rules = [rule];
    const restoredManager = new KizunaManager(
      restoredConfig,
      storage,
      'rule-limit-test',
    );
    expect(
      (await restoredManager.processInteraction(createInteraction()))
        .pointsAdded,
    ).toBe(1);
    restoredManager.destroy();
  });

  it('serializes concurrent storage writes in interaction order', async () => {
    let releaseFirstSave: () => void = () => undefined;
    let notifyFirstSave: () => void = () => undefined;
    const firstSaveStarted = new Promise<void>((resolve) => {
      notifyFirstSave = resolve;
    });
    const firstSavePending = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const snapshots: unknown[] = [];
    const storage: StorageProvider = {
      async save(_key, data) {
        snapshots.push(JSON.parse(JSON.stringify(data)));
        if (snapshots.length === 1) {
          notifyFirstSave();
          await firstSavePending;
        }
      },
      async load<T>(): Promise<T | null> {
        return null;
      },
      async remove() {},
      async getAllKeys() {
        return [];
      },
      async clear() {},
    };
    const manager = new KizunaManager(
      createConfig(),
      storage,
      'write-order-test',
    );
    const first = manager.processInteraction(
      createInteraction({ message: 'First' }),
    );
    await firstSaveStarted;
    const second = manager.processInteraction(
      createInteraction({ message: 'Second' }),
    );
    await Promise.resolve();
    expect(snapshots).toHaveLength(1);

    releaseFirstSave();
    await Promise.all([first, second]);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toMatchObject({
      users: {
        'user-1': {
          points: 2,
          stats: {
            interactionHistory: [{ message: 'First' }, { message: 'Second' }],
          },
        },
      },
    });
    manager.destroy();
  });

  it('shares concurrent initialization and creates one cleanup interval', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const manager = createManager();
    await Promise.all([manager.initialize(), manager.initialize()]);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    manager.destroy();
  });

  it('does not create an interval when destroyed during initialization', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let releaseLoad: () => void = () => undefined;
    let loadCount = 0;
    const pendingLoad = new Promise<null>((resolve) => {
      releaseLoad = () => resolve(null);
    });
    const storage: StorageProvider = {
      async save() {},
      async load<T>(): Promise<T | null> {
        loadCount++;
        return (await pendingLoad) as T | null;
      },
      async remove() {},
      async getAllKeys() {
        return [];
      },
      async clear() {},
    };
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const manager = new KizunaManager(
      createConfig(),
      storage,
      'initialization-test',
    );
    const initializations = Promise.all([
      manager.initialize(),
      manager.initialize(),
    ]);
    manager.destroy();
    releaseLoad();
    await expect(initializations).rejects.toThrow(
      'KizunaManager initialization was cancelled',
    );
    expect(loadCount).toBe(1);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('keeps generated threshold IDs stable when configuration order changes', async () => {
    const firstThreshold: Threshold = {
      points: 1,
      action: { type: 'custom', data: { name: 'First' } },
      repeatable: false,
    };
    const secondThreshold: Threshold = {
      points: 10,
      action: { type: 'custom', data: { name: 'Second' } },
      repeatable: false,
    };
    const storage = createMemoryStorage();
    const firstManager = new KizunaManager(
      createConfig([firstThreshold, secondThreshold]),
      storage,
      'threshold-order-test',
    );
    await firstManager.processInteraction(createInteraction());
    firstManager.destroy();
    const restoredManager = new KizunaManager(
      createConfig([secondThreshold, firstThreshold]),
      storage,
      'threshold-order-test',
    );
    const result = await restoredManager.processInteraction(
      createInteraction(),
    );
    expect(result.triggeredActions).toEqual([]);
    restoredManager.destroy();
  });

  it('clears its cleanup interval and listeners when destroyed', async () => {
    const manager = createManager();
    const listener = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    manager.on('points_updated', listener);
    await manager.processInteraction(createInteraction());
    manager.destroy();
    await manager.addPoints('user-1', 1);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
