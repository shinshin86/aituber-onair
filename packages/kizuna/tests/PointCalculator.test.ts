import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BondEvaluator } from '../src/BondEvaluator';
import { PointCalculator } from '../src/PointCalculator';
import { createDefaultKizunaConfig } from '../src/defaultConfig';
import type {
  Interaction,
  KizunaConfig,
  KizunaUser,
  PointRule,
} from '../src/types';

const createConfig = (rules: PointRule[] = []): KizunaConfig => ({
  ...createDefaultKizunaConfig(),
  basePoints: { message: 1 },
  rules,
  stages: undefined,
  continuity: { unit: 'day' },
});

const createUser = (role: KizunaUser['role'] = 'guest'): KizunaUser => ({
  id: `${role}-user`,
  displayName: 'User',
  role,
  points: 0,
  level: 1,
  achievements: [],
  triggeredThresholds: [],
  stats: {
    totalInteractions: 1,
    totalPointsEarned: 0,
    continuity: {
      streak: 1,
      totalActiveBuckets: 1,
      lastContactAt: new Date(),
      lastBucketKey: 'day:0',
      lastBucketIndex: 0,
    },
    favoriteEmotions: {},
  },
  firstSeen: new Date(),
  lastSeen: new Date(),
});

const createInteraction = (
  overrides: Partial<Interaction> = {},
): Interaction => ({
  userId: 'guest-user',
  kind: 'message',
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
    const config = createConfig([rule]);
    const calculator = new PointCalculator(config, new BondEvaluator(config));
    const user = createUser();
    const interaction = createInteraction();

    expect(calculator.calculatePoints(interaction, user).points).toBe(6);
    expect(calculator.calculatePoints(interaction, user).points).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(calculator.calculatePoints(interaction, user).points).toBe(6);
  });

  it('resets a rule bucket limit in the next continuity bucket', () => {
    const rule: PointRule = {
      id: 'bucket-limit',
      name: 'Bucket bonus',
      condition: () => true,
      points: 4,
      bucketLimit: 1,
    };
    const config = createConfig([rule]);
    const calculator = new PointCalculator(config, new BondEvaluator(config));
    const user = createUser();
    const first = createInteraction();

    expect(calculator.calculatePoints(first, user).points).toBe(5);
    expect(calculator.calculatePoints(first, user).points).toBe(1);
    const nextDay = createInteraction({
      timestamp: new Date('2026-01-02T12:00:00Z').getTime(),
    });
    expect(calculator.calculatePoints(nextDay, user).points).toBe(5);
  });

  it('keeps cooldown records isolated for opaque user IDs', () => {
    const rule: PointRule = {
      id: 'cooldown',
      name: 'Cooldown bonus',
      condition: () => true,
      points: 5,
      cooldown: 1_000,
    };
    const config = createConfig([rule]);
    const calculator = new PointCalculator(config, new BondEvaluator(config));
    const user = createUser();
    user.id = 'group:user';
    const interaction = createInteraction({ userId: user.id });

    expect(calculator.calculatePoints(interaction, user).points).toBe(6);
    calculator.resetUserCooldowns('group');

    expect(calculator.calculatePoints(interaction, user).points).toBe(1);
  });

  it('applies functional rule points before the owner multiplier', () => {
    const rule: PointRule = {
      id: 'dynamic',
      name: 'Dynamic bonus',
      condition: () => true,
      points: (interaction) => (interaction.kind === 'message' ? 3 : 0),
    };
    const config = createConfig([rule]);
    config.basePoints.message = 2;
    config.owner.pointMultiplier = 2;
    const calculator = new PointCalculator(config, new BondEvaluator(config));
    const user = createUser('owner');

    const result = calculator.calculatePoints(
      createInteraction({ userId: user.id, isOwner: true }),
      user,
    );

    expect(result.points).toBe(10);
  });

  it('awards the owner first-contact bonus once per bucket', () => {
    const config = createConfig();
    config.owner.firstContactBonus = 7;
    const calculator = new PointCalculator(config, new BondEvaluator(config));
    const user = createUser('owner');
    const first = createInteraction({ userId: user.id, isOwner: true });

    expect(
      calculator.calculatePoints(first, user, undefined, true).points,
    ).toBe(8);
    expect(
      calculator.calculatePoints(first, user, undefined, false).points,
    ).toBe(1);
    const nextDay = createInteraction({
      userId: user.id,
      isOwner: true,
      timestamp: new Date('2026-01-02T12:00:00Z').getTime(),
    });
    expect(
      calculator.calculatePoints(nextDay, user, undefined, true).points,
    ).toBe(8);
  });

  it('ignores rules whose conditions or point functions throw', () => {
    const rules: PointRule[] = [
      {
        id: 'broken-condition',
        name: 'Broken condition',
        condition: () => {
          throw new Error('condition failed');
        },
        points: 100,
      },
      {
        id: 'broken-points',
        name: 'Broken points',
        condition: () => true,
        points: () => {
          throw new Error('points failed');
        },
      },
    ];
    const config = createConfig(rules);
    const calculator = new PointCalculator(config, new BondEvaluator(config));

    const result = calculator.calculatePoints(
      createInteraction(),
      createUser(),
    );

    expect(result.points).toBe(1);
    expect(result.appliedRules).toEqual([]);
  });
});
