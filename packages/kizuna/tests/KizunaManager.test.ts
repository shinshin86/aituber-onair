import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KizunaManager } from '../src/KizunaManager';
import type {
  KizunaConfig,
  KizunaEventType,
  PointContext,
  StorageProvider,
  Threshold,
} from '../src/types';

const createConfig = (
  thresholds: Threshold[] = [],
  basePoints = 1,
): KizunaConfig => ({
  enabled: true,
  owner: {
    initialPoints: 0,
    pointMultiplier: 1,
    specialCommands: [],
    exclusiveAchievements: [],
    dailyBonus: 0,
  },
  platforms: {
    youtube: {
      basePoints: { comment: basePoints },
    },
  },
  thresholds,
  storage: {
    maxUsers: 100,
    dataRetentionDays: 30,
    cleanupIntervalHours: 24,
  },
  dev: {
    debugMode: false,
    logLevel: 'error',
    showDebugPanel: false,
  },
});

const createContext = (
  overrides: Partial<PointContext> = {},
): PointContext => ({
  userId: 'youtube:user',
  platform: 'youtube',
  message: 'Hello',
  emotion: 'happy',
  isOwner: false,
  timestamp: Date.now(),
  ...overrides,
});

const createManager = (
  thresholds: Threshold[] = [],
  basePoints = 1,
): KizunaManager =>
  new KizunaManager(
    createConfig(thresholds, basePoints),
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

  it('updates user activity, emotion statistics, and interaction history', async () => {
    const manager = createManager();

    await manager.processInteraction(createContext());
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    await manager.processInteraction(
      createContext({ message: 'Next day', emotion: 'calm' }),
    );

    const user = manager.getUser('youtube:user');
    expect(user?.stats).toMatchObject({
      totalMessages: 2,
      totalPointsEarned: 2,
      dailyStreak: 2,
      todayMessages: 1,
      favoriteEmotions: { happy: 1, calm: 1 },
    });
    expect(user?.stats.interactionHistory).toHaveLength(2);
    expect(user?.stats.interactionHistory?.[1]).toMatchObject({
      points: 1,
      message: 'Next day',
      emotion: 'calm',
      appliedRules: [],
    });
  });

  it('keeps only the latest 100 interaction records', async () => {
    const manager = createManager();

    for (let index = 0; index < 101; index++) {
      await manager.processInteraction(
        createContext({ message: `Message ${index}` }),
      );
    }

    const history = manager.getUser('youtube:user')?.stats.interactionHistory;
    expect(history).toHaveLength(100);
    expect(history?.[0]?.message).toBe('Message 1');
    expect(history?.[99]?.message).toBe('Message 100');
  });

  it('updates the level when points cross a level boundary', async () => {
    const manager = createManager([], 100);

    const result = await manager.processInteraction(createContext());

    expect(result).toMatchObject({
      pointsAdded: 100,
      totalPoints: 100,
      leveledUp: true,
      newLevel: 2,
    });
    expect(manager.getUser('youtube:user')?.level).toBe(2);
  });

  it('reports aggregate user and point statistics', async () => {
    const manager = createManager();
    await manager.processInteraction(createContext());
    await manager.processInteraction(
      createContext({
        userId: 'owner:default',
        platform: 'chatForm',
        isOwner: true,
      }),
    );

    expect(manager.getStats()).toEqual({
      totalUsers: 2,
      totalPoints: 2,
      averageLevel: 1,
      ownerUsers: 1,
      activeToday: 2,
    });
  });

  it('fires non-repeatable thresholds once and repeatable thresholds again', async () => {
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
    const manager = createManager(thresholds, 5);

    const first = await manager.processInteraction(createContext());
    const second = await manager.processInteraction(createContext());

    expect(first.triggeredActions).toHaveLength(2);
    expect(second.triggeredActions).toHaveLength(1);
    expect(second.triggeredActions[0]?.type).toBe('custom');
    expect(manager.getUser('youtube:user')?.triggeredThresholds).toEqual([
      'once',
      'repeat',
    ]);
  });

  it('does not mark an invalid achievement action as completed', async () => {
    const threshold: Threshold = {
      id: 'invalid-achievement',
      points: 1,
      action: {
        type: 'achievement',
        data: { id: 'missing-required-fields' },
      },
      repeatable: false,
    };
    const manager = createManager([threshold]);

    const result = await manager.processInteraction(createContext());

    expect(result.triggeredActions).toEqual([]);
    expect(manager.getUser('youtube:user')?.triggeredThresholds).toEqual([]);
    expect(manager.getUser('youtube:user')?.achievements).toEqual([]);
  });

  it('grants achievements and emits state events in order', async () => {
    const achievementThreshold: Threshold = {
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
    const manager = createManager([achievementThreshold], 100);
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

    await manager.processInteraction(createContext());

    expect(manager.getUser('youtube:user')?.achievements).toEqual([
      expect.objectContaining({
        id: 'companion',
        title: 'Companion',
        earnedAt: new Date('2026-01-01T12:00:00Z'),
      }),
    ]);
    expect(eventOrder).toEqual(eventTypes);
  });

  it('restores user state and non-repeatable threshold tracking', async () => {
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
      'kizuna-persistence-test',
    );
    await firstManager.processInteraction(createContext());
    firstManager.destroy();

    const restoredManager = new KizunaManager(
      createConfig([threshold]),
      storage,
      'kizuna-persistence-test',
    );
    await restoredManager.initialize();

    const restoredUser = restoredManager.getUser('youtube:user');
    expect(restoredUser?.firstSeen).toBeInstanceOf(Date);
    expect(
      restoredUser?.stats.interactionHistory?.[0]?.timestamp,
    ).toBeInstanceOf(Date);
    expect(restoredUser?.stats.lastPointsEarned).toBeInstanceOf(Date);
    expect(restoredUser?.triggeredThresholds).toEqual(['first-contact']);

    const result = await restoredManager.processInteraction(createContext());

    expect(result.triggeredActions).toEqual([]);
    expect(restoredManager.getUser('youtube:user')?.stats.totalMessages).toBe(
      2,
    );
    restoredManager.destroy();
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
      'kizuna-initialization-test',
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
      'kizuna-threshold-order-test',
    );
    await firstManager.processInteraction(createContext());
    firstManager.destroy();

    const restoredManager = new KizunaManager(
      createConfig([secondThreshold, firstThreshold]),
      storage,
      'kizuna-threshold-order-test',
    );
    const result = await restoredManager.processInteraction(createContext());

    expect(result.triggeredActions).toEqual([]);
    restoredManager.destroy();
  });

  it('clears its cleanup interval and listeners when destroyed', async () => {
    const manager = createManager();
    const pointsListener = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    manager.on('points_updated', pointsListener);
    await manager.processInteraction(createContext());

    manager.destroy();
    await manager.addPoints('youtube:user', 1);

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(pointsListener).toHaveBeenCalledTimes(1);
  });
});
