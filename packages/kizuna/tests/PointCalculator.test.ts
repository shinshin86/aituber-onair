import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PointCalculator } from '../src/PointCalculator';
import type {
  KizunaConfig,
  KizunaUser,
  PointContext,
  PointRule,
} from '../src/types';

const createConfig = (customRules: PointRule[] = []): KizunaConfig => ({
  enabled: true,
  owner: {
    initialPoints: 0,
    pointMultiplier: 2,
    specialCommands: [],
    exclusiveAchievements: [],
    dailyBonus: 0,
  },
  platforms: {
    youtube: {
      basePoints: { comment: 1 },
    },
    chatForm: {
      basePoints: { message: 2 },
    },
  },
  thresholds: [],
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
  customRules,
});

const createUser = (type: KizunaUser['type'] = 'youtube'): KizunaUser => ({
  id: `${type}:user`,
  displayName: 'User',
  type,
  points: 0,
  level: 1,
  achievements: [],
  triggeredThresholds: [],
  stats: {
    totalMessages: 1,
    totalPointsEarned: 0,
    dailyStreak: 1,
    favoriteEmotions: {},
    todayMessages: 1,
  },
  firstSeen: new Date(),
  lastSeen: new Date(),
});

const createContext = (
  overrides: Partial<PointContext> = {},
): PointContext => ({
  userId: 'youtube:user',
  platform: 'youtube',
  message: 'Hello',
  isOwner: false,
  timestamp: Date.now(),
  ...overrides,
});

describe('PointCalculator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks a rule until its cooldown expires', () => {
    const rule: PointRule = {
      id: 'cooldown',
      name: 'Cooldown bonus',
      condition: () => true,
      points: 5,
      cooldown: 1_000,
    };
    const calculator = new PointCalculator(createConfig([rule]));
    const user = createUser();
    const context = createContext();

    expect(calculator.calculatePoints(context, user).points).toBe(6);
    expect(calculator.calculatePoints(context, user).points).toBe(1);

    vi.advanceTimersByTime(1_000);

    expect(calculator.calculatePoints(context, user).points).toBe(6);
  });

  it('resets a daily rule limit at the next UTC day boundary', () => {
    const rule: PointRule = {
      id: 'daily-limit',
      name: 'Daily bonus',
      condition: () => true,
      points: 4,
      dailyLimit: 1,
    };
    const calculator = new PointCalculator(createConfig([rule]));
    const user = createUser();
    const context = createContext();

    expect(calculator.calculatePoints(context, user).points).toBe(5);
    expect(calculator.calculatePoints(context, user).points).toBe(1);

    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));

    expect(calculator.calculatePoints(context, user).points).toBe(5);
  });

  it('applies the owner multiplier to base and rule points', () => {
    const rule: PointRule = {
      id: 'owner-rule',
      name: 'Owner bonus',
      condition: () => true,
      points: 3,
    };
    const calculator = new PointCalculator(createConfig([rule]));
    const user = createUser('owner');
    const context = createContext({
      userId: 'owner:default',
      platform: 'chatForm',
      isOwner: true,
    });

    expect(calculator.calculatePoints(context, user).points).toBe(10);
  });

  it('ignores a rule whose condition throws', () => {
    const rule: PointRule = {
      id: 'broken-condition',
      name: 'Broken condition',
      condition: () => {
        throw new Error('condition failed');
      },
      points: 100,
    };
    const calculator = new PointCalculator(createConfig([rule]));

    const result = calculator.calculatePoints(createContext(), createUser());

    expect(result.points).toBe(1);
    expect(result.appliedRules).toEqual([]);
  });
});
