/**
 * KizunaManager - Main class for the Kizuna system
 *
 * Manages relationships with users and controls the point system
 */

import type {
	KizunaConfig,
	KizunaUser,
	PointContext,
	PointResult,
	PointRule,
	KizunaEventType,
	KizunaEventData,
	KizunaManagerInterface,
	StorageProvider,
} from "./types";
import { PointCalculator } from "./PointCalculator";

/**
 * Basic implementation of event emitter
 */
class EventEmitter {
	private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

	on(event: string, listener: (...args: unknown[]) => void): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)?.push(listener);
	}

	off(event: string, listener: (...args: unknown[]) => void): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			const index = eventListeners.indexOf(listener);
			if (index !== -1) {
				eventListeners.splice(index, 1);
			}
		}
	}

	emit(event: string, data?: unknown): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			for (const listener of eventListeners) {
				try {
					listener(data);
				} catch (error) {
					console.error(`Error in event listener for ${event}:`, error);
				}
			}
		}
	}

	removeAllListeners(): void {
		this.listeners.clear();
	}
}

/**
 * Main manager class for the Kizuna system
 */
export class KizunaManager
	extends EventEmitter
	implements KizunaManagerInterface
{
	private config: KizunaConfig;
	private users: Map<string, KizunaUser> = new Map();
	private storageProvider: StorageProvider | null = null;
	private isInitialized = false;
	private pointCalculator: PointCalculator;
	private storageKey: string;

	constructor(
		config: KizunaConfig,
		storageProvider?: StorageProvider,
		storageKey?: string,
	) {
		super();
		this.config = { ...config };
		this.storageProvider = storageProvider || null;
		this.pointCalculator = new PointCalculator(this.config);

		if (!storageKey) {
			throw new Error(
				"storageKey is required for KizunaManager. Please provide a complete localStorage key.",
			);
		}
		this.storageKey = storageKey;

		if (this.config.dev.debugMode) {
			console.log(
				"[Kizuna] KizunaManager initialized with config:",
				this.config,
			);
		}
	}

	/**
	 * Initialization process
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			// Load data from storage
			if (this.storageProvider) {
				await this.loadFromStorage();
			}

			// Set up automatic cleanup
			this.setupAutoCleanup();

			this.isInitialized = true;
			this.log("info", "KizunaManager initialized successfully");
		} catch (error) {
			this.log("error", "Failed to initialize KizunaManager:", error);
			throw error;
		}
	}

	/**
	 * Interaction processing - Main point calculation logic
	 */
	async processInteraction(context: PointContext): Promise<PointResult> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.config.dev.debugMode) {
				this.log(
					"debug",
					`Processing interaction for ${context.userId} with emotion: ${context.emotion}`,
				);
			}

			// Get or create user
			const user = this.getOrCreateUser(context);

			// Calculate points
			const calculationResult = this.calculatePoints(context, user);

			// Add points
			const result = await this.addPoints(
				context.userId,
				calculationResult.points,
				context,
				calculationResult.appliedRules,
			);

			// Add interaction record
			this.addInteractionRecord(user, context, result);

			// Save to storage
			if (this.storageProvider) {
				await this.saveToStorage();
			}

			if (this.config.dev.debugMode) {
				this.log(
					"debug",
					`Interaction processed: ${result.pointsAdded} points added (${result.appliedRules.length} rules applied)`,
				);
				if (result.appliedRules.length > 0) {
					this.log(
						"debug",
						`Applied rules: ${result.appliedRules.map((r) => r.name).join(", ")}`,
					);
				}
			}

			return result;
		} catch (error) {
			this.log("error", "Error processing interaction:", error);
			this.emitEvent("error", { error, context });
			throw error;
		}
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
	 * Add points
	 */
	async addPoints(
		userId: string,
		points: number,
		context?: PointContext,
		appliedRules?: PointRule[],
	): Promise<PointResult> {
		const user = this.users.get(userId);
		if (!user) {
			throw new Error(`User not found: ${userId}`);
		}

		const oldPoints = user.points;
		const oldLevel = user.level;

		user.points += points;
		user.lastSeen = new Date();
		user.stats.totalPointsEarned += Math.max(0, points); // Don't include negative points in statistics

		// Calculate level
		const newLevel = this.calculateLevel(user.points);
		const leveledUp = newLevel > oldLevel;
		if (leveledUp) {
			user.level = newLevel;
		}

		// Threshold check (temporary implementation)
		const triggeredActions = this.checkThresholds(user, oldPoints);

		const result: PointResult = {
			pointsAdded: points,
			totalPoints: user.points,
			appliedRules: appliedRules || [],
			triggeredActions,
			leveledUp,
			...(leveledUp && { newLevel }),
		};

		// Emit event
		this.emitEvent("points_updated", {
			userId,
			oldPoints,
			newPoints: user.points,
			pointsAdded: points,
		});

		if (leveledUp) {
			this.emitEvent("level_up", {
				userId,
				oldLevel,
				newLevel,
			});
		}

		return result;
	}

	/**
	 * Calculate level
	 */
	calculateLevel(points: number): number {
		// Simple level calculation (1 level per 100 points, max 10 levels)
		return Math.min(Math.floor(points / 100) + 1, 10);
	}

	/**
	 * Get statistics
	 */
	getStats(): Record<string, unknown> {
		const users = this.getAllUsers();
		return {
			totalUsers: users.length,
			totalPoints: users.reduce((sum, user) => sum + user.points, 0),
			averageLevel:
				users.reduce((sum, user) => sum + user.level, 0) / users.length || 0,
			ownerUsers: users.filter((user) => user.type === "owner").length,
			activeToday: users.filter((user) => {
				const today = new Date();
				const lastSeen = new Date(user.lastSeen);
				return lastSeen.toDateString() === today.toDateString();
			}).length,
		};
	}

	// ============================================================================
	// Private methods
	// ============================================================================

	/**
	 * Get or create user
	 */
	private getOrCreateUser(context: PointContext): KizunaUser {
		let user = this.users.get(context.userId);

		if (!user) {
			// Create new user
			user = this.createUser(context);
			this.users.set(context.userId, user);

			this.emitEvent("user_created", { userId: context.userId, user });
			this.log("info", `New user created: ${context.userId}`);
		} else {
			// Update existing user
			user.lastSeen = new Date();
			user.stats.totalMessages++;

			// Count today's messages
			const today = new Date().toDateString();
			const lastSeenDate = new Date(user.lastSeen).toDateString();
			if (today !== lastSeenDate) {
				user.stats.todayMessages = 1;
			} else {
				user.stats.todayMessages++;
			}
		}

		return user;
	}

	/**
	 * Create new user
	 */
	private createUser(context: PointContext): KizunaUser {
		const userType = this.determineUserType(context);
		const displayName = this.extractDisplayName(context.userId);

		const user: KizunaUser = {
			id: context.userId,
			displayName,
			type: userType,
			points: userType === "owner" ? this.config.owner.initialPoints : 0,
			level: 1,
			achievements: [],
			stats: {
				totalMessages: 1,
				totalPointsEarned: 0,
				dailyStreak: 1,
				favoriteEmotions: {},
				todayMessages: 1,
			},
			firstSeen: new Date(),
			lastSeen: new Date(),
		};

		return user;
	}

	/**
	 * Determine user type
	 */
	private determineUserType(context: PointContext): import("./types").UserType {
		if (context.isOwner || context.platform === "chatForm") {
			return "owner";
		}

		switch (context.platform) {
			case "youtube":
				return "youtube";
			case "twitch":
				return "twitch";
			case "websocket":
				return "websocket";
			default:
				return "websocket"; // Default
		}
	}

	/**
	 * Extract display name from user ID
	 */
	private extractDisplayName(userId: string): string {
		const parts = userId.split(":");
		return parts.length > 1 ? parts[1] || "unknown" : userId;
	}

	/**
	 * Calculate points
	 */
	private calculatePoints(
		context: PointContext,
		user: KizunaUser,
	): { points: number; appliedRules: PointRule[] } {
		const calculationResult = this.pointCalculator.calculatePoints(
			context,
			user,
		);
		return {
			points: calculationResult.points,
			appliedRules: calculationResult.appliedRules,
		};
	}

	/**
	 * Check thresholds (temporary implementation)
	 */
	private checkThresholds(
		user: KizunaUser,
		oldPoints: number,
	): import("./types").ThresholdAction[] {
		const triggeredActions: import("./types").ThresholdAction[] = [];

		for (const threshold of this.config.thresholds) {
			if (user.points >= threshold.points && oldPoints < threshold.points) {
				triggeredActions.push({
					...threshold.action,
					executedAt: new Date(),
				});

				this.emitEvent("threshold_reached", {
					userId: user.id,
					threshold,
					user,
				});
			}
		}

		return triggeredActions;
	}

	/**
	 * Add interaction record
	 */
	private addInteractionRecord(
		user: KizunaUser,
		context: PointContext,
		result: PointResult,
	): void {
		// TODO: Implement interaction history
		// Add record to user.stats.interactionHistory
	}

	/**
	 * Load data from storage
	 */
	private async loadFromStorage(): Promise<void> {
		if (!this.storageProvider) return;

		try {
			const userData = await this.storageProvider.load<
				Record<string, KizunaUser>
			>(this.storageKey);
			if (userData) {
				// Restore Date objects
				for (const [userId, user] of Object.entries(userData)) {
					user.firstSeen = new Date(user.firstSeen);
					user.lastSeen = new Date(user.lastSeen);
					this.users.set(userId, user);
				}
				this.log("info", `Loaded ${this.users.size} users from storage`);
			}
		} catch (error) {
			this.log("error", "Failed to load from storage:", error);
		}
	}

	/**
	 * Save data to storage
	 */
	private async saveToStorage(): Promise<void> {
		if (!this.storageProvider) return;

		try {
			const userData = Object.fromEntries(this.users);
			await this.storageProvider.save(this.storageKey, userData);
			this.log("debug", "Data saved to storage");
		} catch (error) {
			this.log("error", "Failed to save to storage:", error);
		}
	}

	/**
	 * Set up automatic cleanup
	 */
	private setupAutoCleanup(): void {
		const intervalMs =
			this.config.storage.cleanupIntervalHours * 60 * 60 * 1000;

		setInterval(() => {
			this.performCleanup();
		}, intervalMs);
	}

	/**
	 * Perform data cleanup
	 */
	private performCleanup(): void {
		const now = Date.now();
		const retentionMs =
			this.config.storage.dataRetentionDays * 24 * 60 * 60 * 1000;
		let cleanedCount = 0;

		for (const [userId, user] of this.users) {
			// Don't delete owners
			if (user.type === "owner") continue;

			// Delete users who exceed retention period
			if (now - new Date(user.lastSeen).getTime() > retentionMs) {
				this.users.delete(userId);
				cleanedCount++;
			}
		}

		// If max users exceeded, delete oldest users first
		if (this.users.size > this.config.storage.maxUsers) {
			const sortedUsers = Array.from(this.users.entries())
				.filter(([, user]) => user.type !== "owner")
				.sort(
					([, a], [, b]) =>
						new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime(),
				);

			const toDelete = sortedUsers.slice(
				0,
				this.users.size - this.config.storage.maxUsers,
			);
			for (const [userId] of toDelete) {
				this.users.delete(userId);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			this.log("info", `Cleaned up ${cleanedCount} users`);
		}
	}

	/**
	 * Emit event
	 */
	private emitEvent(type: KizunaEventType, data: unknown): void {
		const eventData: KizunaEventData = {
			type,
			userId: (data as { userId?: string })?.userId || "",
			data,
			timestamp: new Date(),
		};

		this.emit(type, eventData);
	}

	/**
	 * Log output
	 */
	private log(
		level: import("./types").LogLevel,
		message: string,
		...args: unknown[]
	): void {
		if (!this.shouldLog(level)) return;

		const timestamp = new Date().toISOString();
		const prefix = `[Kizuna ${timestamp}]`;

		switch (level) {
			case "debug":
				console.debug(prefix, message, ...args);
				break;
			case "info":
				console.info(prefix, message, ...args);
				break;
			case "warn":
				console.warn(prefix, message, ...args);
				break;
			case "error":
				console.error(prefix, message, ...args);
				break;
		}
	}

	/**
	 * Check log level
	 */
	private shouldLog(level: import("./types").LogLevel): boolean {
		const levels = ["debug", "info", "warn", "error"];
		const currentLevel = levels.indexOf(this.config.dev.logLevel);
		const messageLevel = levels.indexOf(level);

		return messageLevel >= currentLevel;
	}
}
