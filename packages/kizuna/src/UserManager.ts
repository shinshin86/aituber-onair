/**
 * UserManager - User management class
 *
 * Manages creation, retrieval, and updates of Kizuna users
 */

import type {
	KizunaUser,
	PointContext,
	UserStats,
	Achievement,
	InteractionRecord,
	UserType,
	KizunaConfig,
} from "./types";
import {
	generateUserId,
	parseUserId,
	getDisplayName,
} from "./utils/userIdGenerator";

/**
 * User management class
 */
export class UserManager {
	private users: Map<string, KizunaUser> = new Map();
	private config: KizunaConfig;

	constructor(config: KizunaConfig) {
		this.config = config;
	}

	/**
	 * Get or create user
	 */
	getOrCreateUser(context: PointContext): KizunaUser {
		// Generate user ID
		const userId = this.generateUserIdFromContext(context);

		let user = this.users.get(userId);

		if (!user) {
			// Create new user
			user = this.createUser(userId, context);
			this.users.set(userId, user);
			this.log(`New user created: ${userId} (${user.displayName})`);
		} else {
			// Update existing user information
			this.updateUserActivity(user, context);
		}

		return user;
	}

	/**
	 * Get user
	 */
	getUser(userId: string): KizunaUser | null {
		return this.users.get(userId) || null;
	}

	/**
	 * Get all users
	 */
	getAllUsers(): KizunaUser[] {
		return Array.from(this.users.values());
	}

	/**
	 * Get user count
	 */
	getUserCount(): number {
		return this.users.size;
	}

	/**
	 * Get user count by platform
	 */
	getUserCountByPlatform(): Record<UserType, number> {
		const counts: Record<UserType, number> = {
			owner: 0,
			youtube: 0,
			twitch: 0,
			websocket: 0,
		};

		for (const user of this.users.values()) {
			counts[user.type]++;
		}

		return counts;
	}

	/**
	 * Get active users (users who accessed within specified period)
	 */
	getActiveUsers(hours = 24): KizunaUser[] {
		const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

		return this.getAllUsers().filter(
			(user) => new Date(user.lastSeen).getTime() > cutoffTime,
		);
	}

	/**
	 * Get top users (by points)
	 */
	getTopUsers(limit = 10): KizunaUser[] {
		return this.getAllUsers()
			.sort((a, b) => b.points - a.points)
			.slice(0, limit);
	}

	/**
	 * Delete user
	 */
	deleteUser(userId: string): boolean {
		const user = this.users.get(userId);
		if (!user) {
			return false;
		}

		// Cannot delete owner
		if (user.type === "owner") {
			this.log(`Cannot delete owner user: ${userId}`);
			return false;
		}

		this.users.delete(userId);
		this.log(`User deleted: ${userId}`);
		return true;
	}

	/**
	 * Reset user points
	 */
	resetUserPoints(userId: string): boolean {
		const user = this.users.get(userId);
		if (!user) {
			return false;
		}

		const oldPoints = user.points;
		user.points = user.type === "owner" ? this.config.owner.initialPoints : 0;
		user.level = this.calculateLevel(user.points);

		this.log(`User points reset: ${userId} (${oldPoints} -> ${user.points})`);
		return true;
	}

	/**
	 * Grant achievement to user
	 */
	grantAchievement(userId: string, achievement: Achievement): boolean {
		const user = this.users.get(userId);
		if (!user) {
			return false;
		}

		// Check if user already has the same achievement
		const hasAchievement = user.achievements.some(
			(a) => a.id === achievement.id,
		);
		if (hasAchievement) {
			return false;
		}

		user.achievements.push({
			...achievement,
			earnedAt: new Date(),
		});

		this.log(`Achievement granted to ${userId}: ${achievement.title}`);
		return true;
	}

	/**
	 * Add user interaction record
	 */
	addInteractionRecord(
		userId: string,
		context: PointContext,
		pointsEarned: number,
		appliedRules: string[],
	): void {
		const user = this.users.get(userId);
		if (!user) {
			return;
		}

		const record: InteractionRecord = {
			id: this.generateInteractionId(),
			timestamp: new Date(),
			points: pointsEarned,
			message: context.message,
			emotion: context.emotion || undefined,
			platform: this.determineUserType(context),
			appliedRules,
		};

		// Initialize interaction history if not exists
		if (!user.stats.interactionHistory) {
			user.stats.interactionHistory = [];
		}

		user.stats.interactionHistory.push(record);

		// Limit history to latest 100 entries
		if (user.stats.interactionHistory.length > 100) {
			user.stats.interactionHistory = user.stats.interactionHistory.slice(-100);
		}
	}

	/**
	 * Export users in JSON format
	 */
	exportUsers(): string {
		const users = Object.fromEntries(this.users);
		return JSON.stringify(users, null, 2);
	}

	/**
	 * Import users from JSON format
	 */
	importUsers(jsonData: string): {
		success: boolean;
		imported: number;
		errors: string[];
	} {
		const result = { success: false, imported: 0, errors: [] as string[] };

		try {
			const parsedData = JSON.parse(jsonData);

			for (const [userId, userData] of Object.entries(parsedData)) {
				try {
					const user = this.validateAndNormalizeUser(
						userId,
						userData as unknown,
					);
					this.users.set(userId, user);
					result.imported++;
				} catch (error) {
					result.errors.push(`Failed to import user ${userId}: ${error}`);
				}
			}

			result.success = result.errors.length === 0;
			this.log(
				`Import completed: ${result.imported} users imported, ${result.errors.length} errors`,
			);
		} catch (error) {
			result.errors.push(`Failed to parse JSON: ${error}`);
		}

		return result;
	}

	/**
	 * Get user data as Map format (for internal processing)
	 */
	getUsersAsMap(): Map<string, KizunaUser> {
		return new Map(this.users);
	}

	/**
	 * Set user data from Map format (for internal processing)
	 */
	setUsersFromMap(users: Map<string, KizunaUser>): void {
		this.users = new Map(users);
	}

	// ============================================================================
	// Private methods
	// ============================================================================

	/**
	 * Generate user ID from context
	 */
	private generateUserIdFromContext(context: PointContext): string {
		// Use existing user ID if already set
		if (context.userId && context.userId !== "anonymous") {
			return context.userId;
		}

		// Extract username (platform-specific processing)
		const userName = this.extractUserNameFromContext(context);

		return generateUserId(context.platform, userName, context.isOwner);
	}

	/**
	 * Extract username from context
	 */
	private extractUserNameFromContext(context: PointContext): string {
		// Get username from metadata
		if (context.metadata?.userName) {
			return context.metadata.userName as string;
		}

		// Try to extract username from user ID
		try {
			const parsed = parseUserId(context.userId);
			return parsed.userName;
		} catch {
			// Anonymous user if parse fails
			return "anonymous";
		}
	}

	/**
	 * Create new user
	 */
	private createUser(userId: string, context: PointContext): KizunaUser {
		const userType = this.determineUserType(context);
		const displayName = getDisplayName(userId);

		// Set initial points
		const initialPoints =
			userType === "owner" ? this.config.owner.initialPoints : 0;

		const user: KizunaUser = {
			id: userId,
			displayName,
			type: userType,
			points: initialPoints,
			level: this.calculateLevel(initialPoints),
			achievements: [],
			stats: this.createInitialStats(),
			firstSeen: new Date(),
			lastSeen: new Date(),
			customData: {},
		};

		// Grant owner-specific achievements
		if (userType === "owner") {
			this.grantOwnerAchievements(user);
		}

		return user;
	}

	/**
	 * Determine user type
	 */
	private determineUserType(context: PointContext): UserType {
		if (context.isOwner || context.platform === "chatForm") {
			return "owner";
		}

		switch (context.platform) {
			case "youtube":
				return "youtube";
			case "twitch":
				return "twitch";
			case "websocket":
			case "vision":
			case "textFile":
			case "configAdvice":
				return "websocket";
			default:
				return "websocket";
		}
	}

	/**
	 * Create initial statistics
	 */
	private createInitialStats(): UserStats {
		return {
			totalMessages: 1,
			totalPointsEarned: 0,
			dailyStreak: 1,
			favoriteEmotions: {},
			todayMessages: 1,
			interactionHistory: [],
		};
	}

	/**
	 * Update user activity
	 */
	private updateUserActivity(user: KizunaUser, context: PointContext): void {
		const now = new Date();
		const lastSeen = new Date(user.lastSeen);

		user.lastSeen = now;
		user.stats.totalMessages++;

		// Update today's message count
		if (this.isSameDay(now, lastSeen)) {
			user.stats.todayMessages++;
		} else {
			user.stats.todayMessages = 1;

			// Update consecutive login days
			if (this.isConsecutiveDay(now, lastSeen)) {
				user.stats.dailyStreak++;
			} else {
				user.stats.dailyStreak = 1;
			}
		}

		// Update emotion statistics
		if (context.emotion) {
			user.stats.favoriteEmotions[context.emotion] =
				(user.stats.favoriteEmotions[context.emotion] || 0) + 1;
		}
	}

	/**
	 * Grant owner-specific achievements
	 */
	private grantOwnerAchievements(user: KizunaUser): void {
		const ownerAchievements = [
			{
				id: "first_adopter",
				title: "First Adopter",
				description: "Early adopter of AITuber OnAir",
				icon: "🏆",
			},
			{
				id: "master_of_aituber",
				title: "Master of AITuber",
				description: "Master of AITuber",
				icon: "👑",
			},
		];

		for (const achievement of ownerAchievements) {
			if (this.config.owner.exclusiveAchievements.includes(achievement.id)) {
				user.achievements.push({
					...achievement,
					earnedAt: new Date(),
				});
			}
		}
	}

	/**
	 * Calculate level
	 */
	private calculateLevel(points: number): number {
		// 1 level up per 100 points, max 10 levels
		return Math.min(Math.floor(points / 100) + 1, 10);
	}

	/**
	 * Generate interaction ID
	 */
	private generateInteractionId(): string {
		return `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	/**
	 * Check if same day
	 */
	private isSameDay(date1: Date, date2: Date): boolean {
		return date1.toDateString() === date2.toDateString();
	}

	/**
	 * Check if consecutive day
	 */
	private isConsecutiveDay(today: Date, lastSeen: Date): boolean {
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		return this.isSameDay(yesterday, lastSeen);
	}

	/**
	 * Validate and normalize user data
	 */
	private validateAndNormalizeUser(
		userId: string,
		userData: unknown,
	): KizunaUser {
		// Check required fields
		const requiredFields = ["id", "displayName", "type", "points", "level"];
		if (typeof userData !== "object" || userData === null) {
			throw new Error("Invalid user data: must be an object");
		}

		for (const field of requiredFields) {
			if (!(field in userData)) {
				throw new Error(`Missing required field: ${field}`);
			}
		}

		const data = userData as Record<string, unknown>;

		// Normalize Date objects
		const user: KizunaUser = {
			...data,
			firstSeen: new Date(data.firstSeen as string),
			lastSeen: new Date(data.lastSeen as string),
			achievements:
				(data.achievements as unknown[] | undefined)?.map((a: unknown) => {
					const achievement = a as Record<string, unknown>;
					return {
						...achievement,
						earnedAt: new Date(achievement.earnedAt as string),
					};
				}) || [],
			stats: {
				...(data.stats as Record<string, unknown>),
				interactionHistory:
					(
						(data.stats as Record<string, unknown>)?.interactionHistory as
							| unknown[]
							| undefined
					)?.map((r: unknown) => {
						const record = r as Record<string, unknown>;
						return {
							...record,
							timestamp: new Date(record.timestamp as string),
						};
					}) || [],
			},
		} as KizunaUser;

		return user;
	}

	/**
	 * Log output
	 */
	private log(message: string): void {
		if (this.config.dev.debugMode) {
			console.log(`[UserManager] ${message}`);
		}
	}
}
