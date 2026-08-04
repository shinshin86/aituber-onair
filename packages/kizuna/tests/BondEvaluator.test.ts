import { describe, expect, it } from 'vitest';
import { BondEvaluator } from '../src/BondEvaluator';
import { createDefaultKizunaConfig } from '../src/defaultConfig';
import type { Interaction, KizunaConfig, SessionInfo } from '../src/types';

const DAY_MS = 24 * 60 * 60 * 1_000;

const createInteraction = (timestamp: number): Interaction => ({
  userId: 'user-1',
  kind: 'message',
  isOwner: false,
  timestamp,
});

const createConfig = (overrides: Partial<KizunaConfig> = {}): KizunaConfig => ({
  ...createDefaultKizunaConfig(),
  ...overrides,
});

describe('BondEvaluator', () => {
  it('decays warmth at the half-life boundary and respects the floor', () => {
    const start = Date.UTC(2026, 0, 1);
    const evaluator = new BondEvaluator(
      createConfig({ warmth: { halfLifeMs: 1_000, floor: 0.2 } }),
    );

    expect(evaluator.calculateWarmth(new Date(start), start)).toBe(1);
    expect(evaluator.calculateWarmth(new Date(start), start + 1_000)).toBe(0.5);
    expect(evaluator.calculateWarmth(new Date(start), start + 10_000)).toBe(
      0.2,
    );
  });

  it('resolves configurable stages and stage-derived levels', () => {
    const evaluator = new BondEvaluator(
      createConfig({
        stages: [
          { id: 'new', minPoints: 0 },
          { id: 'known', minPoints: 10 },
          { id: 'trusted', minPoints: 50 },
        ],
      }),
    );

    expect(evaluator.resolveStage(0).id).toBe('new');
    expect(evaluator.resolveStage(49).id).toBe('known');
    expect(evaluator.resolveStage(50).id).toBe('trusted');
    expect(evaluator.calculateLevel(50)).toBe(3);
  });

  it('rejects stage configurations that do not cover zero points', () => {
    expect(
      () =>
        new BondEvaluator(
          createConfig({ stages: [{ id: 'known', minPoints: 100 }] }),
        ),
    ).toThrow('The first bond stage must start at zero or below');
  });

  it('derives levels from points when stages are not configured', () => {
    const evaluator = new BondEvaluator(
      createConfig({
        stages: undefined,
        levels: { pointsPerLevel: 25, maxLevel: 4 },
      }),
    );

    expect(evaluator.calculateLevel(0)).toBe(1);
    expect(evaluator.calculateLevel(25)).toBe(2);
    expect(evaluator.calculateLevel(10_000)).toBe(4);
    expect(evaluator.normalizePoints(75)).toBe(1);
  });

  it('uses explicit level configuration alongside named stages', () => {
    const evaluator = new BondEvaluator(
      createConfig({ levels: { pointsPerLevel: 25, maxLevel: 10 } }),
    );

    expect(evaluator.resolveStage(100).id).toBe('acquaintance');
    expect(evaluator.calculateLevel(100)).toBe(5);
  });

  it('updates day continuity with grace and resets beyond it', () => {
    const evaluator = new BondEvaluator(
      createConfig({ continuity: { unit: 'day', grace: 1 } }),
    );
    const start = Date.UTC(2026, 0, 1, 12);
    const continuity = evaluator.createContinuity(createInteraction(start));

    evaluator.updateContinuity(continuity, createInteraction(start + DAY_MS));
    evaluator.updateContinuity(
      continuity,
      createInteraction(start + 3 * DAY_MS),
    );
    expect(continuity.streak).toBe(3);

    evaluator.updateContinuity(
      continuity,
      createInteraction(start + 6 * DAY_MS),
    );
    expect(continuity).toMatchObject({
      streak: 1,
      totalActiveBuckets: 4,
    });
  });

  it('uses Monday boundaries for week continuity', () => {
    const evaluator = new BondEvaluator(
      createConfig({ continuity: { unit: 'week' } }),
    );
    const sunday = Date.UTC(2026, 0, 4, 12);
    const monday = Date.UTC(2026, 0, 5, 12);
    const continuity = evaluator.createContinuity(createInteraction(sunday));

    evaluator.updateContinuity(continuity, createInteraction(monday));

    expect(continuity).toMatchObject({ streak: 2, totalActiveBuckets: 2 });
  });

  it('supports custom numeric and session buckets', () => {
    const customEvaluator = new BondEvaluator(
      createConfig({
        continuity: {
          unit: (interaction) => Number(interaction.metadata?.bucket),
          grace: 1,
        },
      }),
    );
    const first = createInteraction(0);
    first.metadata = { bucket: 1 };
    const third = createInteraction(1);
    third.metadata = { bucket: 3 };
    const customContinuity = customEvaluator.createContinuity(first);
    customEvaluator.updateContinuity(customContinuity, third);
    expect(customContinuity.streak).toBe(2);

    const sessionEvaluator = new BondEvaluator(
      createConfig({ continuity: { unit: 'session', grace: 1 } }),
    );
    const session1: SessionInfo = { id: 'one', index: 1 };
    const session3: SessionInfo = { id: 'three', index: 3 };
    const sessionContinuity = sessionEvaluator.createContinuity(
      createInteraction(0),
      session1,
    );
    sessionEvaluator.updateContinuity(
      sessionContinuity,
      createInteraction(1),
      session3,
    );
    expect(sessionContinuity.streak).toBe(2);
  });

  it('rejects unordered custom continuity buckets', () => {
    const evaluator = new BondEvaluator(
      createConfig({
        continuity: {
          unit: () => Number.NaN,
        },
      }),
    );

    expect(() => evaluator.createContinuity(createInteraction(0))).toThrow(
      'Custom continuity buckets must be safe integers',
    );
  });
});
