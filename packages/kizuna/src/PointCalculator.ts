import { BondEvaluator } from './BondEvaluator';
import type {
  Interaction,
  KizunaConfig,
  KizunaUser,
  PointRule,
  SessionInfo,
} from './types';

interface CalculationResult {
  points: number;
  appliedRules: PointRule[];
  breakdown: CalculationBreakdown[];
}

interface CalculationBreakdown {
  ruleName: string;
  points: number;
  description: string;
}

interface LimitRecord {
  lastApplied: number;
  bucketKey: string;
  bucketCount: number;
}

export interface PersistedLimitRecord extends LimitRecord {
  userId: string;
  ruleId: string;
}

export class PointCalculator {
  private readonly records = new Map<string, Map<string, LimitRecord>>();
  private readonly now: () => number;

  constructor(
    private readonly config: KizunaConfig,
    private readonly bondEvaluator = new BondEvaluator(config),
  ) {
    this.now = config.now ?? Date.now;
  }

  calculatePoints(
    interaction: Interaction,
    user: KizunaUser,
    session?: SessionInfo,
    isFirstContactInBucket = false,
  ): CalculationResult {
    const basePoints = this.config.basePoints[interaction.kind] ?? 1;
    const result: CalculationResult = {
      points: basePoints,
      appliedRules: [],
      breakdown: [
        {
          ruleName: 'base_points',
          points: basePoints,
          description: `Base points (${interaction.kind})`,
        },
      ],
    };

    for (const rule of this.config.rules) {
      if (!this.canApplyRule(rule, interaction, user, session)) continue;
      const points = this.resolveRulePoints(rule, interaction, user);
      if (points === null) continue;
      result.points += points;
      result.appliedRules.push(rule);
      result.breakdown.push({
        ruleName: rule.id,
        points,
        description: rule.description ?? rule.name,
      });
      this.recordRuleApplication(rule, user.id, interaction, session);
    }

    if (user.role === 'owner') {
      const bonusPoints = Math.floor(
        result.points * (this.config.owner.pointMultiplier - 1),
      );
      if (bonusPoints !== 0) {
        result.points += bonusPoints;
        result.breakdown.push({
          ruleName: 'owner_multiplier',
          points: bonusPoints,
          description: `Owner multiplier bonus (×${this.config.owner.pointMultiplier})`,
        });
      }

      const firstContactBonus = isFirstContactInBucket
        ? this.config.owner.firstContactBonus
        : 0;
      if (firstContactBonus !== 0) {
        result.points += firstContactBonus;
        result.breakdown.push({
          ruleName: 'first_contact_bonus',
          points: firstContactBonus,
          description: 'First contact bonus',
        });
      }
    }

    return result;
  }

  canApplyRule(
    rule: PointRule,
    interaction: Interaction,
    user: KizunaUser,
    session?: SessionInfo,
  ): boolean {
    const record = this.records.get(user.id)?.get(rule.id);
    if (
      rule.cooldown &&
      record &&
      this.now() - record.lastApplied < rule.cooldown
    ) {
      return false;
    }

    if (rule.bucketLimit && rule.bucketLimit > 0) {
      const bucketKey = this.bondEvaluator.resolveBucket(
        interaction,
        session,
      ).key;
      if (
        record?.bucketKey === bucketKey &&
        record.bucketCount >= rule.bucketLimit
      ) {
        return false;
      }
    }

    try {
      return rule.condition(interaction, user);
    } catch (error) {
      this.log(`Error evaluating rule condition for ${rule.id}: ${error}`);
      return false;
    }
  }

  recordRuleApplication(
    rule: PointRule,
    userId: string,
    interaction: Interaction,
    session?: SessionInfo,
  ): void {
    const bucketKey = this.bondEvaluator.resolveBucket(
      interaction,
      session,
    ).key;
    const userRecords = this.records.get(userId) ?? new Map();
    const existing = userRecords.get(rule.id);
    userRecords.set(rule.id, {
      lastApplied: this.now(),
      bucketKey,
      bucketCount:
        existing?.bucketKey === bucketKey ? existing.bucketCount + 1 : 1,
    });
    this.records.set(userId, userRecords);
  }

  clearCooldowns(): void {
    this.records.clear();
  }

  resetUserCooldowns(userId: string): void {
    this.records.delete(userId);
  }

  exportLimitRecords(): PersistedLimitRecord[] {
    const records: PersistedLimitRecord[] = [];
    for (const [userId, userRecords] of this.records) {
      for (const [ruleId, record] of userRecords) {
        records.push({ userId, ruleId, ...record });
      }
    }
    return records;
  }

  importLimitRecords(value: unknown): void {
    if (!Array.isArray(value)) return;
    this.records.clear();
    for (const item of value) {
      if (!this.isPersistedLimitRecord(item)) continue;
      const userRecords = this.records.get(item.userId) ?? new Map();
      userRecords.set(item.ruleId, {
        lastApplied: item.lastApplied,
        bucketKey: item.bucketKey,
        bucketCount: item.bucketCount,
      });
      this.records.set(item.userId, userRecords);
    }
  }

  private resolveRulePoints(
    rule: PointRule,
    interaction: Interaction,
    user: KizunaUser,
  ): number | null {
    try {
      const points =
        typeof rule.points === 'function'
          ? rule.points(interaction, user)
          : rule.points;
      return Number.isFinite(points) ? points : null;
    } catch (error) {
      this.log(`Error calculating rule points for ${rule.id}: ${error}`);
      return null;
    }
  }

  private log(message: string): void {
    if (this.config.dev.debugMode) console.log(`[PointCalculator] ${message}`);
  }

  private isPersistedLimitRecord(
    value: unknown,
  ): value is PersistedLimitRecord {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return (
      typeof record.userId === 'string' &&
      typeof record.ruleId === 'string' &&
      typeof record.lastApplied === 'number' &&
      Number.isFinite(record.lastApplied) &&
      typeof record.bucketKey === 'string' &&
      typeof record.bucketCount === 'number' &&
      Number.isFinite(record.bucketCount) &&
      record.bucketCount >= 0
    );
  }
}
