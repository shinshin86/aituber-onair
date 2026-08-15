import { DEFAULT_BOND_STAGES } from './defaultConfig';
import type {
  BondStage,
  ContinuityConfig,
  ContinuityStats,
  Interaction,
  KizunaConfig,
  SessionInfo,
  WarmthConfig,
} from './types';

export interface ContinuityBucket {
  key: string;
  index?: number;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

export class BondEvaluator {
  private readonly stages: BondStage[];
  private readonly warmth: WarmthConfig;
  private readonly continuity: ContinuityConfig;
  private readonly now: () => number;
  private readonly usesStageLevels: boolean;
  private readonly hasConfiguredStages: boolean;
  private readonly pointsPerLevel: number;
  private readonly maxLevel: number;

  constructor(config: KizunaConfig) {
    this.hasConfiguredStages = Boolean(config.stages?.length);
    this.usesStageLevels = !config.levels && this.hasConfiguredStages;
    this.stages = [...(config.stages ?? DEFAULT_BOND_STAGES)].sort(
      (left, right) => left.minPoints - right.minPoints,
    );
    if (this.hasConfiguredStages && (this.stages[0]?.minPoints ?? 0) > 0) {
      throw new Error('The first bond stage must start at zero or below');
    }
    this.warmth = config.warmth ?? {
      halfLifeMs: 7 * DAY_MS,
      floor: 0.2,
    };
    this.continuity = config.continuity ?? { unit: 'day', grace: 0 };
    this.now = config.now ?? Date.now;
    this.pointsPerLevel = Math.max(1, config.levels?.pointsPerLevel ?? 100);
    this.maxLevel = Math.max(1, config.levels?.maxLevel ?? 10);
  }

  resolveStage(points: number): BondStage {
    const fallbackStage: BondStage = {
      id: 'stranger',
      minPoints: 0,
    };
    let resolved = this.stages[0] ?? DEFAULT_BOND_STAGES[0] ?? fallbackStage;
    for (const stage of this.stages) {
      if (points < stage.minPoints) break;
      resolved = stage;
    }
    return resolved;
  }

  resolveStageWithHysteresis(
    points: number,
    currentStageId: string,
    margin: number,
  ): BondStage {
    const rawStage = this.resolveStage(points);
    const currentIndex = this.stages.findIndex(
      ({ id }) => id === currentStageId,
    );
    const rawIndex = this.stages.indexOf(rawStage);
    if (currentIndex < 0 || rawIndex >= currentIndex) return rawStage;
    const currentStage = this.stages[currentIndex];
    if (!currentStage) return rawStage;
    return points < currentStage.minPoints - Math.max(0, margin)
      ? rawStage
      : currentStage;
  }

  calculateLevel(points: number): number {
    if (this.usesStageLevels) {
      const stage = this.resolveStage(points);
      return Math.max(1, this.stages.indexOf(stage) + 1);
    }
    return Math.min(
      Math.floor(Math.max(0, points) / this.pointsPerLevel) + 1,
      this.maxLevel,
    );
  }

  calculateLevelForStage(points: number, stageId: string): number {
    if (!this.usesStageLevels) return this.calculateLevel(points);
    const stageIndex = this.stages.findIndex(({ id }) => id === stageId);
    return stageIndex >= 0 ? stageIndex + 1 : this.calculateLevel(points);
  }

  getStageIndex(stageId: string): number {
    return this.stages.findIndex(({ id }) => id === stageId);
  }

  calculateWarmth(lastContactAt: Date, at = this.now()): number {
    const halfLifeMs = Math.max(1, this.warmth.halfLifeMs);
    const floor = Math.min(1, Math.max(0, this.warmth.floor));
    const elapsed = Math.max(0, at - lastContactAt.getTime());
    return Math.max(floor, 2 ** (-elapsed / halfLifeMs));
  }

  createContinuity(
    interaction: Interaction,
    session?: SessionInfo,
  ): ContinuityStats {
    const bucket = this.resolveBucket(interaction, session);
    return {
      streak: 1,
      totalActiveBuckets: 1,
      lastContactAt: new Date(interaction.timestamp),
      lastBucketKey: bucket.key,
      ...(bucket.index !== undefined && { lastBucketIndex: bucket.index }),
    };
  }

  updateContinuity(
    continuity: ContinuityStats,
    interaction: Interaction,
    session?: SessionInfo,
  ): void {
    const bucket = this.resolveBucket(interaction, session);
    if (interaction.timestamp > continuity.lastContactAt.getTime()) {
      continuity.lastContactAt = new Date(interaction.timestamp);
    }

    if (bucket.key === continuity.lastBucketKey) return;
    if (
      bucket.index !== undefined &&
      continuity.lastBucketIndex !== undefined &&
      bucket.index <= continuity.lastBucketIndex
    ) {
      return;
    }

    continuity.totalActiveBuckets++;
    if (
      bucket.index !== undefined &&
      continuity.lastBucketIndex !== undefined
    ) {
      const missedBuckets = bucket.index - continuity.lastBucketIndex - 1;
      continuity.streak =
        missedBuckets <= Math.max(0, this.continuity.grace ?? 0)
          ? continuity.streak + 1
          : 1;
    } else {
      continuity.streak++;
    }

    continuity.lastBucketKey = bucket.key;
    if (bucket.index === undefined) {
      continuity.lastBucketIndex = undefined;
    } else {
      continuity.lastBucketIndex = bucket.index;
    }
  }

  resolveBucket(
    interaction: Interaction,
    session?: SessionInfo,
  ): ContinuityBucket {
    const { unit } = this.continuity;
    if (typeof unit === 'function') {
      const value = unit(interaction, session);
      if (!Number.isSafeInteger(value)) {
        throw new Error('Custom continuity buckets must be safe integers');
      }
      return { key: `custom:${value}`, index: value };
    }
    if (unit === 'session') {
      return session
        ? { key: `session:${session.index}`, index: session.index }
        : { key: 'session:none', index: 0 };
    }

    const dayIndex = Math.floor(interaction.timestamp / DAY_MS);
    if (unit === 'day') {
      return { key: `day:${dayIndex}`, index: dayIndex };
    }

    const date = new Date(interaction.timestamp);
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    const monday = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysSinceMonday,
    );
    const weekIndex = Math.floor(monday / (7 * DAY_MS));
    return { key: `week:${weekIndex}`, index: weekIndex };
  }

  normalizePoints(points: number): number {
    const highestThreshold = this.hasConfiguredStages
      ? (this.stages[this.stages.length - 1]?.minPoints ?? 1)
      : this.pointsPerLevel * Math.max(1, this.maxLevel - 1);
    if (highestThreshold <= 0) return points > 0 ? 1 : 0;
    return Math.min(1, Math.max(0, points) / highestThreshold);
  }
}
