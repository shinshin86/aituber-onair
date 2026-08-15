import { afterEach, describe, expect, it, vi } from 'vitest';
import { KizunaManager } from '../src/KizunaManager';
import { createDefaultKizunaConfig } from '../src/defaultConfig';
import type {
  BondDynamicsConfig,
  Interaction,
  KizunaConfig,
} from '../src/types';

const DAY_MS = 24 * 60 * 60 * 1_000;
const START = Date.UTC(2026, 0, 1, 12);
const managers: KizunaManager[] = [];

interface Harness {
  manager: KizunaManager;
  interaction: (overrides?: Partial<Interaction>) => Interaction;
  advance: (milliseconds: number) => void;
}

function createHarness(
  options: {
    basePoints?: Record<string, number>;
    dynamics?: BondDynamicsConfig;
    config?: Partial<KizunaConfig>;
    key?: string;
  } = {},
): Harness {
  let now = START;
  const config = createDefaultKizunaConfig();
  config.now = () => now;
  config.basePoints = {
    ...config.basePoints,
    message: 10,
    reaction: 10,
    gift: 10,
    ...options.basePoints,
  };
  config.dynamics = { ...config.dynamics, ...options.dynamics };
  Object.assign(config, options.config);
  const manager = new KizunaManager(
    config,
    undefined,
    options.key ?? `dynamics-${managers.length}`,
  );
  managers.push(manager);
  return {
    manager,
    interaction: (overrides = {}) => ({
      userId: 'user-1',
      kind: 'message',
      message: 'Hello',
      emotion: 'happy',
      isOwner: false,
      timestamp: now,
      metadata: { displayName: 'Aki' },
      ...overrides,
    }),
    advance(milliseconds) {
      now += milliseconds;
    },
  };
}

async function seedRegular(harness: Harness, userId = 'user-1'): Promise<void> {
  await harness.manager.processInteraction(
    harness.interaction({ userId, emotion: 'happy' }),
  );
  const points = harness.manager.getUser(userId)?.points ?? 0;
  await harness.manager.addPoints(userId, 500 - points);
}

afterEach(() => {
  for (const manager of managers.splice(0)) manager.destroy();
});

describe('human-modeled bond dynamics', () => {
  it('rule 1 applies the default 3x negativity bias', async () => {
    const harness = createHarness({
      dynamics: {
        firstOffenseMultiplier: 1,
        stageBuffers: {
          stranger: 1,
          acquaintance: 1,
          regular: 1,
          companion: 1,
        },
      },
    });
    await seedRegular(harness);

    const result = await harness.manager.processInteraction(
      harness.interaction({
        kind: 'reaction',
        emotion: 'angry',
      }),
    );

    expect(result.pointsAdded).toBe(-30);
  });

  it('rule 2 buffers a first light offense for a warm regular', async () => {
    const harness = createHarness({ basePoints: { message: 1, reaction: 1 } });
    await seedRegular(harness);

    const result = await harness.manager.processInteraction(
      harness.interaction({ kind: 'reaction', emotion: 'angry' }),
    );
    const afterAnger = harness.manager.getBondSnapshot('user-1');

    expect(result.pointsAdded).toBeCloseTo(-0.675);
    expect(afterAnger).toMatchObject({ stage: 'regular', trend: 'falling' });
    expect(afterAnger?.points).toBeGreaterThan(499);
    expect(afterAnger?.warmth).toBeLessThan(1);

    for (let index = 0; index < 3; index++) {
      await harness.manager.processInteraction(
        harness.interaction({ emotion: 'happy' }),
      );
    }
    expect(harness.manager.getBondSnapshot('user-1')?.warmth).toBeGreaterThan(
      0.97,
    );
  });

  it('rule 3 makes grave violations unbuffered and rate-limits scars per bucket', async () => {
    const harness = createHarness({ basePoints: { message: 1, reaction: 1 } });
    await seedRegular(harness);

    const first = await harness.manager.processInteraction(
      harness.interaction({
        kind: 'reaction',
        valence: 'negative',
        severity: 'grave',
      }),
    );
    const second = await harness.manager.processInteraction(
      harness.interaction({
        kind: 'reaction',
        valence: 'negative',
        severity: 'grave',
      }),
    );
    harness.advance(DAY_MS);
    await harness.manager.processInteraction(
      harness.interaction({
        kind: 'reaction',
        valence: 'negative',
        severity: 'grave',
      }),
    );
    await harness.manager.processInteraction(
      harness.interaction({
        kind: 'reaction',
        valence: 'negative',
        severity: 'grave',
        timestamp: START,
      }),
    );

    expect(first.pointsAdded).toBe(-75);
    expect(Math.abs(second.pointsAdded)).toBeLessThan(
      Math.abs(first.pointsAdded),
    );
    expect(harness.manager.getBondSnapshot('user-1')?.scars).toHaveLength(2);
  });

  it('rule 4 mood-gates gifts while a relationship is cold', async () => {
    const giftHarness = createHarness({ key: 'gift-gated' });
    const messageHarness = createHarness({ key: 'message-control' });
    await seedRegular(giftHarness);
    await seedRegular(messageHarness);
    for (const harness of [giftHarness, messageHarness]) {
      await harness.manager.processInteraction(
        harness.interaction({
          valence: 'negative',
          severity: 'grave',
        }),
      );
    }

    const gift = await giftHarness.manager.processInteraction(
      giftHarness.interaction({ kind: 'gift', emotion: 'happy' }),
    );
    const message = await messageHarness.manager.processInteraction(
      messageHarness.interaction({ kind: 'message', emotion: 'happy' }),
    );

    expect(gift.pointsAdded).toBeCloseTo(message.pointsAdded * 0.25);
  });

  it('does not let gifts buy conflict repair or scar healing', async () => {
    const harness = createHarness({
      dynamics: {
        scarHealingPositiveInteractions: 2,
        scarHealingPositiveBuckets: 2,
      },
    });
    await seedRegular(harness);
    await harness.manager.processInteraction(
      harness.interaction({ valence: 'negative', severity: 'grave' }),
    );
    const afterFight = harness.manager.getBondSnapshot('user-1');

    await harness.manager.processInteraction(
      harness.interaction({ kind: 'gift', emotion: 'happy' }),
    );
    harness.advance(DAY_MS);
    await harness.manager.processInteraction(
      harness.interaction({ kind: 'gift', emotion: 'happy' }),
    );
    const afterGifts = harness.manager.getBondSnapshot('user-1');

    expect(afterGifts?.warmth).toBeLessThanOrEqual(afterFight?.warmth ?? 0);
    expect(afterGifts?.trend).toBe('falling');
    expect(afterGifts?.scars[0]?.healedAt).toBeUndefined();

    await harness.manager.processInteraction(harness.interaction());
    harness.advance(DAY_MS);
    await harness.manager.processInteraction(harness.interaction());
    expect(
      harness.manager.getBondSnapshot('user-1')?.scars[0]?.healedAt,
    ).toBeInstanceOf(Date);
  });

  it('rule 5 diminishes same-bucket gains and rewards continuity', async () => {
    const harness = createHarness();

    const first = await harness.manager.processInteraction(
      harness.interaction(),
    );
    const second = await harness.manager.processInteraction(
      harness.interaction(),
    );
    harness.advance(DAY_MS);
    const nextDay = await harness.manager.processInteraction(
      harness.interaction(),
    );

    expect(first.pointsAdded).toBe(10);
    expect(second.pointsAdded).toBe(8.5);
    expect(nextDay.pointsAdded).toBeCloseTo(10.3);
  });

  it('keeps per-bucket diminishing returns for out-of-order events', async () => {
    const harness = createHarness({
      dynamics: { consistencyBonusPerBucket: 0 },
    });
    await harness.manager.processInteraction(harness.interaction());
    harness.advance(DAY_MS);
    await harness.manager.processInteraction(harness.interaction());

    const delayed = await harness.manager.processInteraction(
      harness.interaction({ timestamp: START }),
    );

    expect(delayed.pointsAdded).toBeCloseTo(8.5);
  });

  it('applies delayed dynamics at a monotonic effective time', async () => {
    const harness = createHarness();
    await seedRegular(harness);
    harness.advance(2 * DAY_MS);
    await harness.manager.processInteraction(
      harness.interaction({ valence: 'negative', severity: 'grave' }),
    );
    const effectiveTime = START + 2 * DAY_MS;
    const currentSnapshot = harness.manager.getBondSnapshot('user-1');

    await harness.manager.processInteraction(
      harness.interaction({
        timestamp: START + DAY_MS,
        emotion: 'happy',
      }),
    );
    await harness.manager.processInteraction(
      harness.interaction({
        timestamp: START,
        valence: 'negative',
        severity: 'grave',
      }),
    );
    await harness.manager.processInteraction(
      harness.interaction({ timestamp: START, valence: 'neutral' }),
    );

    const user = harness.manager.getUser('user-1');
    expect(user?.stats.dynamics?.warmthUpdatedAt.getTime()).toBe(effectiveTime);
    expect(user?.stats.dynamics?.offenseTimestamps).toHaveLength(1);
    expect(
      user?.stats.dynamics?.offenseTimestamps.every(
        (timestamp) => timestamp.getTime() === effectiveTime,
      ),
    ).toBe(true);
    expect(user?.stats.dynamics?.warmth).toBe(currentSnapshot?.warmth);
    expect(user?.stats.dynamics?.trend).toBe(currentSnapshot?.trend);
    expect(user?.scars).toHaveLength(1);
    expect(user?.scars?.every(({ healedAt }) => healedAt === undefined)).toBe(
      true,
    );
  });

  it('sanitizes unsafe dynamics and warmth configuration', async () => {
    const harness = createHarness({
      basePoints: { message: 1, reaction: 1 },
      dynamics: {
        negativityBias: Number.NaN,
        firstOffenseMultiplier: -1,
        lightWarmthPenalty: Number.NaN,
        positiveRepeatMultiplier: Number.POSITIVE_INFINITY,
        maxTrackedBuckets: 0,
      },
      config: {
        warmth: {
          halfLifeMs: Number.NaN,
          floor: Number.POSITIVE_INFINITY,
        },
      },
    });
    await seedRegular(harness);

    const result = await harness.manager.processInteraction(
      harness.interaction({ kind: 'reaction', emotion: 'angry' }),
    );
    const snapshot = harness.manager.getBondSnapshot('user-1');

    expect(result.pointsAdded).toBeCloseTo(-0.675);
    expect(Number.isFinite(snapshot?.points)).toBe(true);
    expect(Number.isFinite(snapshot?.warmth)).toBe(true);
  });

  it('bounds persisted per-bucket dynamics history', async () => {
    const harness = createHarness({ dynamics: { maxTrackedBuckets: 2 } });

    for (let index = 0; index < 4; index++) {
      await harness.manager.processInteraction(harness.interaction());
      harness.advance(DAY_MS);
    }

    expect(
      Object.keys(
        harness.manager.getUser('user-1')?.stats.dynamics
          ?.positiveBucketCounts ?? {},
      ),
    ).toHaveLength(2);
  });

  it('rule 6 accepts explicit valence and rule-provided grave severity', async () => {
    const explicitHarness = createHarness();
    await explicitHarness.manager.processInteraction(
      explicitHarness.interaction(),
    );
    const explicitPositive = await explicitHarness.manager.processInteraction(
      explicitHarness.interaction({ emotion: 'angry', valence: 'positive' }),
    );
    expect(explicitPositive.pointsAdded).toBeGreaterThan(0);

    const ruleHarness = createHarness();
    const config = createDefaultKizunaConfig();
    config.now = () => START;
    config.basePoints = { message: 1 };
    config.rules = [
      {
        id: 'grave-rule',
        name: 'Grave rule',
        condition: () => true,
        points: 0,
        valence: 'negative',
        severity: 'grave',
      },
    ];
    const ruleManager = new KizunaManager(config, undefined, 'rule-valence');
    managers.push(ruleManager);
    await ruleManager.processInteraction(ruleHarness.interaction());
    expect(ruleManager.getBondSnapshot('user-1')?.scars).toHaveLength(1);
  });

  it('rule 7 provides forgiving, human, and strict preset differences', async () => {
    const forgiving = createHarness({ dynamics: { preset: 'forgiving' } });
    const human = createHarness({ dynamics: { preset: 'human' } });
    const strict = createHarness({ dynamics: { preset: 'strict' } });
    for (const harness of [forgiving, human, strict]) {
      await seedRegular(harness);
    }

    const forgivingResult = await forgiving.manager.processInteraction(
      forgiving.interaction({ kind: 'reaction', emotion: 'angry' }),
    );
    const humanResult = await human.manager.processInteraction(
      human.interaction({ kind: 'reaction', emotion: 'angry' }),
    );
    const strictResult = await strict.manager.processInteraction(
      strict.interaction({ kind: 'reaction', emotion: 'angry' }),
    );

    expect(Math.abs(forgivingResult.pointsAdded)).toBeLessThan(
      Math.abs(humanResult.pointsAdded),
    );
    expect(Math.abs(humanResult.pointsAdded)).toBeLessThan(
      Math.abs(strictResult.pointsAdded),
    );
  });

  it('rule 8 includes trend, atmosphere, and notable memory in context', async () => {
    const harness = createHarness();
    await seedRegular(harness);
    await harness.manager.processInteraction(
      harness.interaction({ valence: 'negative', severity: 'grave' }),
    );

    const context = harness.manager.getBondContext('user-1', {
      language: 'ja',
    });
    expect(context).toContain('関係の流れ: 悪化している');
    expect(context).toContain('現在の空気:');
    expect(context).toContain('最近の傷: grave message violation');
  });

  it('rule 9 emits stage_down and scar lifecycle events', async () => {
    const harness = createHarness({
      dynamics: {
        graveBaseDamage: 5,
        scarHealingPositiveInteractions: 3,
        scarHealingPositiveBuckets: 2,
      },
    });
    const stageDown = vi.fn();
    const scarCreated = vi.fn();
    const scarHealed = vi.fn();
    harness.manager.on('stage_down', stageDown);
    harness.manager.on('scar_created', scarCreated);
    harness.manager.on('scar_healed', scarHealed);
    await seedRegular(harness);

    await harness.manager.addPoints('user-1', -10);
    expect(harness.manager.getBondSnapshot('user-1')?.stage).toBe('regular');
    await harness.manager.addPoints('user-1', -20);
    expect(harness.manager.getBondSnapshot('user-1')?.stage).toBe(
      'acquaintance',
    );
    expect(stageDown).toHaveBeenCalledTimes(1);

    await harness.manager.processInteraction(
      harness.interaction({ valence: 'negative', severity: 'grave' }),
    );
    expect(scarCreated).toHaveBeenCalledTimes(1);
    await harness.manager.processInteraction(harness.interaction());
    harness.advance(DAY_MS);
    await harness.manager.processInteraction(harness.interaction());
    await harness.manager.processInteraction(harness.interaction());

    expect(scarHealed).toHaveBeenCalledTimes(1);
    expect(
      harness.manager.getBondSnapshot('user-1')?.scars[0]?.healedAt,
    ).toBeInstanceOf(Date);
  });

  it('rule 10 keeps only positive deltas in totalPointsEarned', async () => {
    const harness = createHarness();
    await harness.manager.processInteraction(harness.interaction());
    const earned = harness.manager.getUser('user-1')?.stats.totalPointsEarned;

    const result = await harness.manager.addPoints('user-1', -100);

    expect(result).toMatchObject({ pointsAdded: -10, totalPoints: 0 });
    expect(harness.manager.getUser('user-1')?.stats.totalPointsEarned).toBe(
      earned,
    );
  });

  it('never damages the bond score because of absence', async () => {
    const harness = createHarness({
      config: { warmth: { halfLifeMs: DAY_MS, floor: 0.2 } },
    });
    await seedRegular(harness);
    const before = harness.manager.getBondSnapshot('user-1');

    harness.advance(30 * DAY_MS);
    const after = harness.manager.getBondSnapshot('user-1');

    expect(after?.points).toBe(before?.points);
    expect(after?.stage).toBe(before?.stage);
    expect(after?.warmth).toBeGreaterThanOrEqual(0.2);
    expect(after?.warmth).toBeLessThan(before?.warmth ?? 0);
  });
});

describe('scene validation', () => {
  it('bounds an alternating negative AI-to-AI exchange without a death spiral', async () => {
    const left = createHarness({ key: 'agent-left' });
    const right = createHarness({ key: 'agent-right' });
    await seedRegular(left, 'agent-right');
    await seedRegular(right, 'agent-left');

    const deltas: number[] = [];
    for (let index = 0; index < 60; index++) {
      const current = index % 2 === 0 ? left : right;
      const counterpart = index % 2 === 0 ? 'agent-right' : 'agent-left';
      const result = await current.manager.processInteraction(
        current.interaction({
          userId: counterpart,
          kind: 'reaction',
          emotion: 'angry',
          severity: 'grave',
        }),
      );
      deltas.push(result.pointsAdded);
    }

    for (const [harness, userId] of [
      [left, 'agent-right'],
      [right, 'agent-left'],
    ] as const) {
      const snapshot = harness.manager.getBondSnapshot(userId);
      expect(snapshot?.points).toBe(0);
      expect(snapshot?.warmth).toBeGreaterThanOrEqual(0.2);
      expect(snapshot?.scars).toHaveLength(1);
    }
    expect(deltas.every((delta) => Number.isFinite(delta))).toBe(true);
    expect(Math.max(...deltas.map(Math.abs))).toBeLessThanOrEqual(75);
    expect(deltas.slice(-4)).toEqual([0, 0, 0, 0]);
  });
});
