/**
 * PointCalculator - Point calculation class
 *
 * Manages platform-specific point rules and performs point calculations
 */

import type {
	PointContext,
	PointRule,
	KizunaUser,
	KizunaConfig,
	PlatformPointConfig,
} from "./types";

/**
 * Point calculation result
 */
interface CalculationResult {
	/** Points to be awarded */
	points: number;
	/** Applied rules */
	appliedRules: PointRule[];
	/** Calculation details */
	breakdown: CalculationBreakdown[];
}

/**
 * Calculation details
 */
interface CalculationBreakdown {
	/** Rule name */
	ruleName: string;
	/** Points */
	points: number;
	/** Description */
	description: string;
}

/**
 * Cooldown management
 */
interface CooldownRecord {
	/** Last applied time */
	lastApplied: number;
	/** Today's application count */
	todayCount: number;
	/** Today's date (YYYY-MM-DD format) */
	today: string;
}

/**
 * Point calculation class
 */
export class PointCalculator {
	private config: KizunaConfig;
	private cooldowns: Map<string, CooldownRecord> = new Map();

	constructor(config: KizunaConfig) {
		this.config = config;
	}

	/**
	 * Main method for point calculation
	 */
	calculatePoints(context: PointContext, user: KizunaUser): CalculationResult {
		const result: CalculationResult = {
			points: 0,
			appliedRules: [],
			breakdown: [],
		};

		// Calculate base points
		const basePoints = this.calculateBasePoints(context, user);
		if (basePoints > 0) {
			result.points += basePoints;
			result.breakdown.push({
				ruleName: "base_points",
				points: basePoints,
				description: `Base points (${context.platform})`,
			});
		}

		// Apply platform-specific rules
		const platformRules = this.applyPlatformRules(context, user);
		result.points += platformRules.points;
		result.appliedRules.push(...platformRules.appliedRules);
		result.breakdown.push(...platformRules.breakdown);

		// Apply custom rules
		const customRules = this.applyCustomRules(context, user);
		result.points += customRules.points;
		result.appliedRules.push(...customRules.appliedRules);
		result.breakdown.push(...customRules.breakdown);

		// Apply owner multiplier
		if (user.type === "owner") {
			const multiplier = this.config.owner.pointMultiplier;
			const bonusPoints = Math.floor(result.points * (multiplier - 1));
			if (bonusPoints > 0) {
				result.points += bonusPoints;
				result.breakdown.push({
					ruleName: "owner_multiplier",
					points: bonusPoints,
					description: `Owner multiplier bonus (×${multiplier})`,
				});
			}
		}

		// Check daily bonus
		const dailyBonus = this.checkDailyBonus(context, user);
		if (dailyBonus > 0) {
			result.points += dailyBonus;
			result.breakdown.push({
				ruleName: "daily_bonus",
				points: dailyBonus,
				description: "Daily bonus",
			});
		}

		this.log(
			`Points calculated for ${user.id}: ${result.points} (${result.appliedRules.length} rules applied)`,
		);
		return result;
	}

	/**
	 * Check if a specific rule can be applied
	 */
	canApplyRule(
		rule: PointRule,
		context: PointContext,
		user: KizunaUser,
	): boolean {
		const cooldownKey = `${user.id}:${rule.id}`;

		if (this.config.dev.debugMode) {
			this.log(
				`[canApplyRule] Checking rule: ${rule.id} for emotion: ${context.emotion}`,
			);
		}

		// Cooldown check
		if (rule.cooldown && rule.cooldown > 0) {
			const record = this.cooldowns.get(cooldownKey);
			if (record) {
				const timePassed = Date.now() - record.lastApplied;
				if (timePassed < rule.cooldown) {
					if (this.config.dev.debugMode) {
						this.log(
							`[canApplyRule] Rule ${rule.id} blocked by cooldown (${timePassed}ms < ${rule.cooldown}ms)`,
						);
					}
					return false;
				}
			}
		}

		// Daily limit check
		if (rule.dailyLimit && rule.dailyLimit > 0) {
			const record = this.getCooldownRecord(cooldownKey);
			if (record.todayCount >= rule.dailyLimit) {
				if (this.config.dev.debugMode) {
					this.log(
						`[canApplyRule] Rule ${rule.id} blocked by daily limit (${record.todayCount} >= ${rule.dailyLimit})`,
					);
				}
				return false;
			}
		}

		// Condition check
		try {
			const conditionResult = rule.condition(context, user);
			if (this.config.dev.debugMode) {
				this.log(
					`[canApplyRule] Rule ${rule.id} condition result: ${conditionResult}`,
				);
			}
			return conditionResult;
		} catch (error) {
			this.log(`Error evaluating rule condition for ${rule.id}: ${error}`);
			return false;
		}
	}

	/**
	 * Record rule application (cooldown management)
	 */
	recordRuleApplication(rule: PointRule, userId: string): void {
		const cooldownKey = `${userId}:${rule.id}`;
		const record = this.getCooldownRecord(cooldownKey);

		record.lastApplied = Date.now();
		record.todayCount++;

		this.cooldowns.set(cooldownKey, record);
	}

	/**
	 * Clear cooldown data
	 */
	clearCooldowns(): void {
		this.cooldowns.clear();
	}

	/**
	 * Reset cooldowns for specific user
	 */
	resetUserCooldowns(userId: string): void {
		for (const [key] of this.cooldowns) {
			if (key.startsWith(`${userId}:`)) {
				this.cooldowns.delete(key);
			}
		}
	}

	// ============================================================================
	// Private methods
	// ============================================================================

	/**
	 * Calculate base points
	 */
	private calculateBasePoints(context: PointContext, user: KizunaUser): number {
		const platformConfig = this.getPlatformConfig(context.platform);
		if (!platformConfig) {
			return 1; // Default points
		}

		// Platform-specific base points
		const actionType = this.getActionType(context);
		return platformConfig.basePoints[actionType] || 1;
	}

	/**
	 * Apply platform-specific rules
	 */
	private applyPlatformRules(
		context: PointContext,
		user: KizunaUser,
	): CalculationResult {
		const result: CalculationResult = {
			points: 0,
			appliedRules: [],
			breakdown: [],
		};

		const platformConfig = this.getPlatformConfig(context.platform);
		if (!platformConfig?.customRules) {
			return result;
		}

		for (const rule of platformConfig.customRules) {
			if (this.canApplyRule(rule, context, user)) {
				result.points += rule.points;
				result.appliedRules.push(rule);
				result.breakdown.push({
					ruleName: rule.id,
					points: rule.points,
					description: rule.description || rule.name,
				});

				this.recordRuleApplication(rule, user.id);
			}
		}

		// Platform-specific bonus calculation
		if (platformConfig.bonusCalculator) {
			try {
				const bonus = platformConfig.bonusCalculator(context);
				if (bonus > 0) {
					result.points += bonus;
					result.breakdown.push({
						ruleName: "platform_bonus",
						points: bonus,
						description: `${context.platform} platform bonus`,
					});
				}
			} catch (error) {
				this.log(`Error in platform bonus calculator: ${error}`);
			}
		}

		return result;
	}

	/**
	 * Apply custom rules
	 */
	private applyCustomRules(
		context: PointContext,
		user: KizunaUser,
	): CalculationResult {
		const result: CalculationResult = {
			points: 0,
			appliedRules: [],
			breakdown: [],
		};

		const customRules = this.config.customRules || [];

		for (const rule of customRules) {
			if (this.canApplyRule(rule, context, user)) {
				result.points += rule.points;
				result.appliedRules.push(rule);
				result.breakdown.push({
					ruleName: rule.id,
					points: rule.points,
					description: rule.description || rule.name,
				});

				this.recordRuleApplication(rule, user.id);
			}
		}

		return result;
	}

	/**
	 * Check daily bonus
	 */
	private checkDailyBonus(context: PointContext, user: KizunaUser): number {
		// No daily bonus for non-owners
		if (user.type !== "owner") {
			return 0;
		}

		const bonusKey = `${user.id}:daily_bonus`;
		const record = this.getCooldownRecord(bonusKey);

		// If bonus already received today
		if (record.todayCount > 0) {
			return 0;
		}

		// Award daily bonus
		record.todayCount = 1;
		record.lastApplied = Date.now();
		this.cooldowns.set(bonusKey, record);

		return this.config.owner.dailyBonus;
	}

	/**
	 * Get platform configuration
	 */
	private getPlatformConfig(platform: string): PlatformPointConfig | null {
		return this.config.platforms[platform] || null;
	}

	/**
	 * Get action type
	 */
	private getActionType(context: PointContext): string {
		// Get action type from metadata
		if (context.metadata?.actionType) {
			return context.metadata.actionType as string;
		}

		// Platform-specific default actions
		switch (context.platform) {
			case "youtube":
				return "comment";
			case "twitch":
				return "chat";
			case "websocket":
				return "message";
			default:
				return "message";
		}
	}

	/**
	 * Get or create cooldown record
	 */
	private getCooldownRecord(key: string): CooldownRecord {
		const today = new Date().toISOString().split("T")[0] || ""; // YYYY-MM-DD
		const existing = this.cooldowns.get(key);

		if (existing && existing.today === today) {
			return existing;
		}

		// New day or first time
		const newRecord: CooldownRecord = {
			lastApplied: 0,
			todayCount: 0,
			today: today,
		};

		this.cooldowns.set(key, newRecord);
		return newRecord;
	}

	/**
	 * Log output
	 */
	private log(message: string): void {
		if (this.config.dev.debugMode) {
			console.log(`[PointCalculator] ${message}`);
		}
	}
}
