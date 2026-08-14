import type { BondEvaluator } from './BondEvaluator';
import type {
  BondAtmosphere,
  BondDynamicsConfig,
  BondDynamicsPreset,
  BondDynamicsState,
  BondScar,
  Interaction,
  InteractionValence,
  KizunaConfig,
  KizunaUser,
  NegativeSeverity,
  PointRule,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_BUCKET_HISTORY_LIMIT = 1_024;

interface ResolvedBondDynamicsConfig {
  preset: BondDynamicsPreset;
  negativityBias: number;
  offenseWindowMs: number;
  firstOffenseMultiplier: number;
  secondOffenseMultiplier: number;
  repeatedOffenseMultiplier: number;
  maxEscalationMultiplier: number;
  stageBuffers: Record<string, number>;
  graveBaseDamage: number;
  positiveRepeatMultiplier: number;
  consistencyBonusPerBucket: number;
  maxConsistencyBonus: number;
  giftWarmthThreshold: number;
  lowWarmthGiftMultiplier: number;
  lightWarmthPenalty: number;
  graveWarmthPenalty: number;
  conflictRecoveryRate: number;
  reunionRecoveryByStage: Record<string, number>;
  demotionHysteresis: number;
  scarHealingPositiveInteractions: number;
  scarHealingPositiveBuckets: number;
  maxTrackedBuckets: number;
}

export interface BondDynamicsEvaluation {
  points: number;
  valence: InteractionValence;
  severity?: NegativeSeverity;
  createdScars: BondScar[];
  healedScars: BondScar[];
}

const HUMAN_DYNAMICS: ResolvedBondDynamicsConfig = {
  preset: 'human',
  negativityBias: 3,
  offenseWindowMs: 7 * DAY_MS,
  firstOffenseMultiplier: 0.5,
  secondOffenseMultiplier: 1,
  repeatedOffenseMultiplier: 1.5,
  maxEscalationMultiplier: 1.5,
  stageBuffers: {
    stranger: 1,
    acquaintance: 0.75,
    regular: 0.45,
    companion: 0.3,
  },
  graveBaseDamage: 25,
  positiveRepeatMultiplier: 0.85,
  consistencyBonusPerBucket: 0.03,
  maxConsistencyBonus: 0.24,
  giftWarmthThreshold: 0.5,
  lowWarmthGiftMultiplier: 0.25,
  lightWarmthPenalty: 0.22,
  graveWarmthPenalty: 0.65,
  conflictRecoveryRate: 0.35,
  reunionRecoveryByStage: {
    stranger: 0.6,
    acquaintance: 0.75,
    regular: 0.9,
    companion: 1,
  },
  demotionHysteresis: 25,
  scarHealingPositiveInteractions: 6,
  scarHealingPositiveBuckets: 3,
  maxTrackedBuckets: 128,
};

const PRESET_OVERRIDES: Record<
  Exclude<BondDynamicsPreset, 'human'>,
  Partial<ResolvedBondDynamicsConfig>
> = {
  forgiving: {
    negativityBias: 2,
    firstOffenseMultiplier: 0.35,
    secondOffenseMultiplier: 0.7,
    repeatedOffenseMultiplier: 1,
    stageBuffers: {
      stranger: 0.75,
      acquaintance: 0.5,
      regular: 0.3,
      companion: 0.2,
    },
    graveBaseDamage: 18,
    lightWarmthPenalty: 0.14,
    graveWarmthPenalty: 0.45,
    conflictRecoveryRate: 0.5,
    lowWarmthGiftMultiplier: 0.4,
    demotionHysteresis: 40,
    scarHealingPositiveInteractions: 4,
    scarHealingPositiveBuckets: 2,
  },
  strict: {
    negativityBias: 4,
    firstOffenseMultiplier: 0.75,
    secondOffenseMultiplier: 1.25,
    repeatedOffenseMultiplier: 1.5,
    stageBuffers: {
      stranger: 1,
      acquaintance: 0.9,
      regular: 0.65,
      companion: 0.45,
    },
    graveBaseDamage: 35,
    lightWarmthPenalty: 0.3,
    graveWarmthPenalty: 0.75,
    conflictRecoveryRate: 0.2,
    lowWarmthGiftMultiplier: 0.1,
    demotionHysteresis: 15,
    scarHealingPositiveInteractions: 8,
    scarHealingPositiveBuckets: 4,
  },
};

const NEGATIVE_EMOTIONS = new Set([
  'angry',
  'annoyed',
  'disgusted',
  'frustrated',
  'hostile',
  'hurt',
]);

export class BondDynamics {
  private readonly dynamics: ResolvedBondDynamicsConfig;
  private readonly halfLifeMs: number;
  private readonly warmthFloor: number;

  constructor(
    config: KizunaConfig,
    private readonly bondEvaluator: BondEvaluator,
  ) {
    this.dynamics = this.resolveConfig(config.dynamics);
    this.halfLifeMs = positiveNumber(config.warmth?.halfLifeMs, 7 * DAY_MS);
    this.warmthFloor = unitNumber(config.warmth?.floor, 0.2);
  }

  createState(interaction: Interaction, points: number): BondDynamicsState {
    return {
      warmth: 1,
      warmthUpdatedAt: new Date(interaction.timestamp),
      conflictChilled: false,
      trend: 'steady',
      currentStage: this.bondEvaluator.resolveStage(points).id,
      offenseTimestamps: [],
      positiveBucketCounts: {},
      graveBucketKeys: [],
      positiveInteractionsSinceScar: 0,
      positiveBucketKeysSinceScar: [],
    };
  }

  normalizeState(
    value: unknown,
    fallbackInteraction: Interaction,
    points: number,
  ): BondDynamicsState {
    const fallback = this.createState(fallbackInteraction, points);
    if (!value || typeof value !== 'object') return fallback;
    const state = value as Record<string, unknown>;
    const warmthUpdatedAt = new Date(
      (state.warmthUpdatedAt as string | number | Date | undefined) ??
        fallbackInteraction.timestamp,
    );
    const normalizedUpdatedAt = Number.isFinite(warmthUpdatedAt.getTime())
      ? warmthUpdatedAt
      : fallback.warmthUpdatedAt;
    return {
      warmth: clampNumber(state.warmth, fallback.warmth),
      warmthUpdatedAt: normalizedUpdatedAt,
      conflictChilled: state.conflictChilled === true,
      trend: isBondTrend(state.trend) ? state.trend : fallback.trend,
      currentStage:
        typeof state.currentStage === 'string' &&
        this.bondEvaluator.getStageIndex(state.currentStage) >= 0
          ? state.currentStage
          : fallback.currentStage,
      offenseTimestamps: normalizeDates(state.offenseTimestamps).slice(-3),
      positiveBucketCounts: normalizeBucketCounts(
        state.positiveBucketCounts,
        state.positiveBucketKey,
        state.positiveCountInBucket,
        this.dynamics.maxTrackedBuckets,
      ),
      graveBucketKeys: normalizeBucketKeys(
        state.graveBucketKeys,
        state.graveBucketKey,
        this.dynamics.maxTrackedBuckets,
      ),
      positiveInteractionsSinceScar: nonNegativeInteger(
        state.positiveInteractionsSinceScar,
      ),
      positiveBucketKeysSinceScar: (Array.isArray(
        state.positiveBucketKeysSinceScar,
      )
        ? state.positiveBucketKeysSinceScar.filter(
            (key): key is string => typeof key === 'string',
          )
        : []
      ).slice(-this.dynamics.scarHealingPositiveBuckets),
    };
  }

  applyInteraction(
    user: KizunaUser,
    interaction: Interaction,
    rawPoints: number,
    appliedRules: PointRule[],
    bucketKey: string,
  ): BondDynamicsEvaluation {
    const state = this.ensureState(user, interaction);
    const valence = this.resolveValence(interaction, rawPoints, appliedRules);
    const previousUpdatedAt = state.warmthUpdatedAt.getTime();
    const chronological = interaction.timestamp >= previousUpdatedAt;
    const at = Math.max(interaction.timestamp, previousUpdatedAt);
    const currentWarmth = this.calculateWarmth(state, at);
    state.warmth = currentWarmth;
    state.warmthUpdatedAt = new Date(at);

    if (valence === 'neutral') {
      if (chronological) state.trend = 'steady';
      return {
        points: 0,
        valence,
        createdScars: [],
        healedScars: [],
      };
    }

    return valence === 'positive'
      ? this.applyPositive(
          user,
          interaction,
          rawPoints,
          bucketKey,
          at,
          chronological,
        )
      : this.applyNegative(
          user,
          interaction,
          rawPoints,
          appliedRules,
          bucketKey,
          at,
          chronological,
        );
  }

  ensureState(user: KizunaUser, interaction?: Interaction): BondDynamicsState {
    if (user.stats.dynamics) return user.stats.dynamics;
    const fallbackInteraction: Interaction =
      interaction ??
      ({
        userId: user.id,
        kind: 'presence',
        isOwner: user.role === 'owner',
        timestamp: user.lastSeen.getTime(),
      } satisfies Interaction);
    user.stats.dynamics = this.createState(fallbackInteraction, user.points);
    return user.stats.dynamics;
  }

  getWarmth(user: KizunaUser, at: number): number {
    return this.calculateWarmth(this.ensureState(user), at);
  }

  getAtmosphere(warmth: number): BondAtmosphere {
    if (warmth >= 0.75) return 'warm';
    if (warmth >= 0.5) return 'neutral';
    if (warmth >= 0.3) return 'cool';
    return 'cold';
  }

  resolveStage(user: KizunaUser, points: number): string {
    const state = this.ensureState(user);
    return this.bondEvaluator.resolveStageWithHysteresis(
      points,
      state.currentStage,
      Math.max(0, this.dynamics.demotionHysteresis),
    ).id;
  }

  private applyPositive(
    user: KizunaUser,
    interaction: Interaction,
    rawPoints: number,
    bucketKey: string,
    at: number,
    chronological: boolean,
  ): BondDynamicsEvaluation {
    const state = this.ensureState(user, interaction);
    const repeatCount = state.positiveBucketCounts[bucketKey] ?? 0;
    const diminishingMultiplier =
      this.dynamics.positiveRepeatMultiplier ** repeatCount;
    const consistencyMultiplier =
      1 +
      Math.min(
        this.dynamics.maxConsistencyBonus,
        Math.max(0, user.stats.continuity.streak - 1) *
          this.dynamics.consistencyBonusPerBucket,
      );
    const giftMultiplier =
      interaction.kind === 'gift' &&
      state.warmth < this.dynamics.giftWarmthThreshold
        ? this.dynamics.lowWarmthGiftMultiplier
        : 1;
    const calculatedPoints =
      Math.max(0, rawPoints) *
      diminishingMultiplier *
      consistencyMultiplier *
      giftMultiplier;
    const points = Number.isFinite(calculatedPoints) ? calculatedPoints : 0;

    setBucketCount(
      state.positiveBucketCounts,
      bucketKey,
      repeatCount + 1,
      this.dynamics.maxTrackedBuckets,
    );
    const giftDuringConflict =
      interaction.kind === 'gift' && state.conflictChilled;
    if (chronological && !giftDuringConflict) {
      state.trend = state.conflictChilled ? 'repairing' : 'rising';
    }
    const recoveryRate = state.conflictChilled
      ? this.dynamics.conflictRecoveryRate
      : (this.dynamics.reunionRecoveryByStage[state.currentStage] ?? 0.75);
    if (chronological && !giftDuringConflict) {
      state.warmth = clamp(state.warmth + (1 - state.warmth) * recoveryRate);
      if (state.conflictChilled && state.warmth >= 0.9) {
        state.conflictChilled = false;
      }
    }

    const scars = ensureScars(user);
    const activeScars = scars.filter(({ healedAt }) => !healedAt);
    const healedScars: BondScar[] = [];
    if (
      activeScars.length > 0 &&
      interaction.kind !== 'gift' &&
      chronological
    ) {
      state.positiveInteractionsSinceScar++;
      if (
        state.positiveBucketKeysSinceScar.length <
          this.dynamics.scarHealingPositiveBuckets &&
        !state.positiveBucketKeysSinceScar.includes(bucketKey)
      ) {
        state.positiveBucketKeysSinceScar.push(bucketKey);
      }
      if (
        state.positiveInteractionsSinceScar >=
          this.dynamics.scarHealingPositiveInteractions &&
        state.positiveBucketKeysSinceScar.length >=
          this.dynamics.scarHealingPositiveBuckets
      ) {
        for (const scar of activeScars) {
          scar.healedAt = new Date(at);
          healedScars.push(scar);
        }
        state.positiveInteractionsSinceScar = 0;
        state.positiveBucketKeysSinceScar = [];
      }
    }

    return {
      points,
      valence: 'positive',
      createdScars: [],
      healedScars,
    };
  }

  private applyNegative(
    user: KizunaUser,
    interaction: Interaction,
    rawPoints: number,
    appliedRules: PointRule[],
    bucketKey: string,
    at: number,
    chronological: boolean,
  ): BondDynamicsEvaluation {
    const state = this.ensureState(user, interaction);
    state.offenseTimestamps = state.offenseTimestamps.filter((timestamp) => {
      const offenseAt = timestamp.getTime();
      return at - offenseAt <= this.dynamics.offenseWindowMs;
    });
    const offenseNumber = state.offenseTimestamps.length + 1;
    const escalation = Math.min(
      this.dynamics.maxEscalationMultiplier,
      offenseNumber === 1
        ? this.dynamics.firstOffenseMultiplier
        : offenseNumber === 2
          ? this.dynamics.secondOffenseMultiplier
          : this.dynamics.repeatedOffenseMultiplier,
    );
    const requestedSeverity = this.resolveSeverity(interaction, appliedRules);
    const severity =
      requestedSeverity === 'grave' &&
      !state.graveBucketKeys.includes(bucketKey)
        ? 'grave'
        : 'light';
    if (severity === 'grave') {
      recordBucketKey(
        state.graveBucketKeys,
        bucketKey,
        this.dynamics.maxTrackedBuckets,
      );
    }
    const damageMultiplier =
      severity === 'grave' ? Math.max(1, escalation) : escalation;

    const magnitude =
      severity === 'grave'
        ? Math.max(Math.abs(rawPoints), this.dynamics.graveBaseDamage)
        : Math.max(Math.abs(rawPoints), 1);
    const stageBuffer =
      severity === 'grave'
        ? 1
        : (this.dynamics.stageBuffers[state.currentStage] ?? 1);
    const calculatedPoints =
      -magnitude *
      this.dynamics.negativityBias *
      damageMultiplier *
      stageBuffer;
    const points = Number.isFinite(calculatedPoints) ? calculatedPoints : 0;

    if (chronological) {
      state.offenseTimestamps.push(new Date(at));
      state.offenseTimestamps = state.offenseTimestamps.slice(-3);
      state.conflictChilled = true;
      state.trend = 'falling';
      const warmthPenalty =
        severity === 'grave'
          ? this.dynamics.graveWarmthPenalty
          : this.dynamics.lightWarmthPenalty;
      state.warmth = Math.max(
        this.warmthFloor,
        state.warmth - warmthPenalty * damageMultiplier,
      );
      state.positiveInteractionsSinceScar = 0;
      state.positiveBucketKeysSinceScar = [];
    }

    const createdScars: BondScar[] = [];
    if (severity === 'grave' && chronological) {
      const scars = ensureScars(user);
      const scar: BondScar = {
        id: `scar_${at}_${scars.length + 1}`,
        summary: `grave ${interaction.kind} violation`,
        createdAt: new Date(at),
      };
      scars.push(scar);
      createdScars.push(scar);
    }

    return {
      points,
      valence: 'negative',
      severity,
      createdScars,
      healedScars: [],
    };
  }

  private calculateWarmth(state: BondDynamicsState, at: number): number {
    const elapsed = Math.max(0, at - state.warmthUpdatedAt.getTime());
    const remaining = 2 ** (-elapsed / this.halfLifeMs);
    return clamp(
      this.warmthFloor +
        (Math.max(this.warmthFloor, state.warmth) - this.warmthFloor) *
          remaining,
    );
  }

  private resolveValence(
    interaction: Interaction,
    rawPoints: number,
    appliedRules: PointRule[],
  ): InteractionValence {
    if (interaction.valence) return interaction.valence;
    const ruleValence = appliedRules.find(({ valence }) => valence)?.valence;
    if (ruleValence) return ruleValence;
    if (interaction.severity || appliedRules.some(({ severity }) => severity)) {
      return 'negative';
    }
    if (rawPoints < 0) return 'negative';
    const emotion = interaction.emotion?.trim().toLowerCase();
    return emotion && NEGATIVE_EMOTIONS.has(emotion) ? 'negative' : 'positive';
  }

  private resolveSeverity(
    interaction: Interaction,
    appliedRules: PointRule[],
  ): NegativeSeverity {
    if (interaction.severity) return interaction.severity;
    return appliedRules.some(({ severity }) => severity === 'grave')
      ? 'grave'
      : 'light';
  }

  private resolveConfig(
    config: BondDynamicsConfig | undefined,
  ): ResolvedBondDynamicsConfig {
    const preset = config?.preset ?? 'human';
    const presetValues =
      preset === 'human' ? {} : (PRESET_OVERRIDES[preset] ?? {});
    const baseline = {
      ...HUMAN_DYNAMICS,
      ...presetValues,
      preset,
      stageBuffers: {
        ...HUMAN_DYNAMICS.stageBuffers,
        ...presetValues.stageBuffers,
      },
      reunionRecoveryByStage: {
        ...HUMAN_DYNAMICS.reunionRecoveryByStage,
        ...presetValues.reunionRecoveryByStage,
      },
    };
    const resolved = {
      ...baseline,
      ...config,
      preset,
      stageBuffers: {
        ...baseline.stageBuffers,
        ...config?.stageBuffers,
      },
      reunionRecoveryByStage: {
        ...baseline.reunionRecoveryByStage,
        ...config?.reunionRecoveryByStage,
      },
    };
    return {
      ...resolved,
      negativityBias: nonNegativeNumber(
        resolved.negativityBias,
        baseline.negativityBias,
      ),
      offenseWindowMs: nonNegativeNumber(
        resolved.offenseWindowMs,
        baseline.offenseWindowMs,
      ),
      firstOffenseMultiplier: nonNegativeNumber(
        resolved.firstOffenseMultiplier,
        baseline.firstOffenseMultiplier,
      ),
      secondOffenseMultiplier: nonNegativeNumber(
        resolved.secondOffenseMultiplier,
        baseline.secondOffenseMultiplier,
      ),
      repeatedOffenseMultiplier: nonNegativeNumber(
        resolved.repeatedOffenseMultiplier,
        baseline.repeatedOffenseMultiplier,
      ),
      maxEscalationMultiplier: Math.min(
        1.5,
        nonNegativeNumber(
          resolved.maxEscalationMultiplier,
          baseline.maxEscalationMultiplier,
        ),
      ),
      stageBuffers: sanitizeNumberRecord(
        resolved.stageBuffers,
        baseline.stageBuffers,
        nonNegativeNumber,
      ),
      graveBaseDamage: nonNegativeNumber(
        resolved.graveBaseDamage,
        baseline.graveBaseDamage,
      ),
      positiveRepeatMultiplier: unitNumber(
        resolved.positiveRepeatMultiplier,
        baseline.positiveRepeatMultiplier,
      ),
      consistencyBonusPerBucket: nonNegativeNumber(
        resolved.consistencyBonusPerBucket,
        baseline.consistencyBonusPerBucket,
      ),
      maxConsistencyBonus: nonNegativeNumber(
        resolved.maxConsistencyBonus,
        baseline.maxConsistencyBonus,
      ),
      giftWarmthThreshold: unitNumber(
        resolved.giftWarmthThreshold,
        baseline.giftWarmthThreshold,
      ),
      lowWarmthGiftMultiplier: unitNumber(
        resolved.lowWarmthGiftMultiplier,
        baseline.lowWarmthGiftMultiplier,
      ),
      lightWarmthPenalty: unitNumber(
        resolved.lightWarmthPenalty,
        baseline.lightWarmthPenalty,
      ),
      graveWarmthPenalty: unitNumber(
        resolved.graveWarmthPenalty,
        baseline.graveWarmthPenalty,
      ),
      conflictRecoveryRate: unitNumber(
        resolved.conflictRecoveryRate,
        baseline.conflictRecoveryRate,
      ),
      reunionRecoveryByStage: sanitizeNumberRecord(
        resolved.reunionRecoveryByStage,
        baseline.reunionRecoveryByStage,
        unitNumber,
      ),
      demotionHysteresis: nonNegativeNumber(
        resolved.demotionHysteresis,
        baseline.demotionHysteresis,
      ),
      scarHealingPositiveInteractions: positiveInteger(
        resolved.scarHealingPositiveInteractions,
        baseline.scarHealingPositiveInteractions,
      ),
      scarHealingPositiveBuckets: positiveInteger(
        Math.min(MAX_BUCKET_HISTORY_LIMIT, resolved.scarHealingPositiveBuckets),
        baseline.scarHealingPositiveBuckets,
      ),
      maxTrackedBuckets: positiveInteger(
        Math.min(MAX_BUCKET_HISTORY_LIMIT, resolved.maxTrackedBuckets),
        baseline.maxTrackedBuckets,
      ),
    };
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ensureScars(user: KizunaUser): BondScar[] {
  if (!user.scars) user.scars = [];
  return user.scars;
}

function clampNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value)
    : fallback;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function unitNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : fallback;
}

function sanitizeNumberRecord(
  value: Record<string, number>,
  fallback: Record<string, number>,
  sanitize: (value: unknown, fallback: number) => number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sanitize(item, fallback[key] ?? 1),
    ]),
  );
}

function setBucketCount(
  counts: Record<string, number>,
  key: string,
  count: number,
  limit: number,
): void {
  delete counts[key];
  counts[key] = count;
  const keys = Object.keys(counts);
  for (const expiredKey of keys.slice(0, Math.max(0, keys.length - limit))) {
    delete counts[expiredKey];
  }
}

function recordBucketKey(keys: string[], key: string, limit: number): void {
  const existingIndex = keys.indexOf(key);
  if (existingIndex >= 0) keys.splice(existingIndex, 1);
  keys.push(key);
  if (keys.length > limit) keys.splice(0, keys.length - limit);
}

function normalizeBucketCounts(
  value: unknown,
  legacyKey: unknown,
  legacyCount: unknown,
  limit: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, count] of Object.entries(value)) {
      const normalizedCount = nonNegativeInteger(count);
      if (normalizedCount > 0) result[key] = normalizedCount;
    }
  }
  if (typeof legacyKey === 'string' && legacyKey) {
    const normalizedCount = nonNegativeInteger(legacyCount);
    if (normalizedCount > 0) result[legacyKey] ??= normalizedCount;
  }
  return Object.fromEntries(Object.entries(result).slice(-limit));
}

function normalizeBucketKeys(
  value: unknown,
  legacyKey: unknown,
  limit: number,
): string[] {
  const keys = Array.isArray(value)
    ? value.filter((key): key is string => typeof key === 'string' && !!key)
    : [];
  if (typeof legacyKey === 'string' && legacyKey) keys.push(legacyKey);
  return [...new Set(keys)].slice(-limit);
}

function normalizeDates(value: unknown): Date[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => new Date(item as string | number | Date))
    .filter((date) => Number.isFinite(date.getTime()));
}

function isBondTrend(value: unknown): value is BondDynamicsState['trend'] {
  return (
    value === 'rising' ||
    value === 'steady' ||
    value === 'falling' ||
    value === 'repairing'
  );
}
