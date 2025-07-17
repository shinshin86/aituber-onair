/**
 * Type definitions for Kizuna system
 * Defines all types for managing bonds with users
 */

// ============================================================================
// Basic type definitions
// ============================================================================

/** Platform types */
export type UserType = "owner" | "youtube" | "twitch" | "websocket";

/** Chat types (inherited from AITuber OnAir) */
export type ChatType =
	| "chatForm"
	| "youtube"
	| "twitch"
	| "websocket"
	| "vision"
	| "textFile"
	| "configAdvice";

/** Log levels */
export type LogLevel = "debug" | "info" | "warn" | "error";

// ============================================================================
// User-related types
// ============================================================================

/** User statistics */
export interface UserStats {
	/** Total messages */
	totalMessages: number;
	/** Total points earned */
	totalPointsEarned: number;
	/** Consecutive login days */
	dailyStreak: number;
	/** Favorite emotions (emotion name -> usage count) */
	favoriteEmotions: Record<string, number>;
	/** Last time points were earned */
	lastPointsEarned?: Date;
	/** Today's message count */
	todayMessages: number;
	/** Interaction history */
	interactionHistory?: InteractionRecord[];
}

/** Achievement */
export interface Achievement {
	/** Achievement ID */
	id: string;
	/** Achievement name */
	title: string;
	/** Description */
	description: string;
	/** Date earned */
	earnedAt: Date;
	/** Icon (emoji, etc.) */
	icon?: string;
}

/** Interaction record */
export interface InteractionRecord {
	/** Record ID */
	id: string;
	/** Occurrence time */
	timestamp: Date;
	/** Points earned */
	points: number;
	/** Message content */
	message: string;
	/** Emotion */
	emotion?: string;
	/** Platform */
	platform: UserType;
	/** Applied rules */
	appliedRules: string[];
}

/** Kizuna user */
export interface KizunaUser {
	/** User ID (platform:username) */
	id: string;
	/** Display name */
	displayName: string;
	/** User type */
	type: UserType;
	/** Current points */
	points: number;
	/** Bond level (1-10) */
	level: number;
	/** Earned achievements */
	achievements: Achievement[];
	/** Statistics */
	stats: UserStats;
	/** First contact time */
	firstSeen: Date;
	/** Last contact time */
	lastSeen: Date;
	/** Custom data (for extension) */
	customData?: Record<string, unknown>;
}

// ============================================================================
// Point system related types
// ============================================================================

/** Point calculation context */
export interface PointContext {
	/** User ID */
	userId: string;
	/** Platform */
	platform: ChatType;
	/** Message content */
	message: string;
	/** Emotion (optional) */
	emotion?: string;
	/** Whether owner */
	isOwner: boolean;
	/** Occurrence time */
	timestamp: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/** Point rule */
export interface PointRule {
	/** Rule ID */
	id: string;
	/** Rule name */
	name: string;
	/** Condition evaluation function */
	condition: (context: PointContext, user?: KizunaUser) => boolean;
	/** Points to award */
	points: number;
	/** Cooldown time (milliseconds, optional) */
	cooldown?: number;
	/** Maximum applications per day (optional) */
	dailyLimit?: number;
	/** Description */
	description?: string;
}

/** Point calculation result */
export interface PointResult {
	/** Points awarded */
	pointsAdded: number;
	/** Total points */
	totalPoints: number;
	/** Applied rules */
	appliedRules: PointRule[];
	/** Triggered actions */
	triggeredActions: ThresholdAction[];
	/** Whether leveled up */
	leveledUp: boolean;
	/** New level */
	newLevel?: number;
}

// ============================================================================
// Threshold and action related types
// ============================================================================

/** Action types */
export type ActionType =
	| "special_response"
	| "unlock_emotion"
	| "achievement"
	| "level_up"
	| "custom";

/** Threshold action */
export interface ThresholdAction {
	/** Action type */
	type: ActionType;
	/** Action data */
	data: Record<string, unknown>;
	/** Execution time */
	executedAt?: Date;
}

/** Threshold definition */
export interface Threshold {
	/** Required points */
	points: number;
	/** Action to execute */
	action: ThresholdAction;
	/** Whether repeatable */
	repeatable: boolean;
	/** Description */
	description?: string;
}

// ============================================================================
// Configuration related types
// ============================================================================

/** Platform-specific point configuration */
export interface PlatformPointConfig {
	/** Base points */
	basePoints: Record<string, number>;
	/** Special bonus calculation function */
	bonusCalculator?: (context: PointContext) => number;
	/** Platform-specific rules */
	customRules?: PointRule[];
}

/** Owner configuration */
export interface OwnerConfig {
	/** Initial points */
	initialPoints: number;
	/** Point earning multiplier */
	pointMultiplier: number;
	/** Available special commands */
	specialCommands: string[];
	/** Owner-exclusive achievements */
	exclusiveAchievements: string[];
	/** Daily bonus */
	dailyBonus: number;
}

/** Storage configuration */
export interface StorageConfig {
	/** Maximum users */
	maxUsers: number;
	/** Data retention period (days) */
	dataRetentionDays: number;
	/** Cleanup interval (hours) */
	cleanupIntervalHours: number;
}

/** Developer configuration */
export interface DevConfig {
	/** Debug mode */
	debugMode: boolean;
	/** Log level */
	logLevel: LogLevel;
	/** Show debug panel */
	showDebugPanel: boolean;
}

/** Overall Kizuna system configuration */
export interface KizunaConfig {
	/** System enabled flag */
	enabled: boolean;
	/** Owner configuration */
	owner: OwnerConfig;
	/** Platform-specific configuration */
	platforms: Record<string, PlatformPointConfig>;
	/** Threshold configuration */
	thresholds: Threshold[];
	/** Storage configuration */
	storage: StorageConfig;
	/** Developer configuration */
	dev: DevConfig;
	/** Custom point rules */
	customRules?: PointRule[];
}

// ============================================================================
// Event related types
// ============================================================================

/** Kizuna event types */
export type KizunaEventType =
	| "points_updated"
	| "level_up"
	| "threshold_reached"
	| "achievement_earned"
	| "user_created"
	| "user_updated"
	| "action_executed"
	| "error";

/** Kizuna event data */
export interface KizunaEventData {
	/** Event type */
	type: KizunaEventType;
	/** User ID */
	userId: string;
	/** Event-specific data */
	data: unknown;
	/** Occurrence time */
	timestamp: Date;
}

// ============================================================================
// Storage provider related types
// ============================================================================

/** Storage provider interface */
export interface StorageProvider {
	/** Save data */
	save(key: string, data: unknown): Promise<void>;
	/** Load data */
	load<T>(key: string): Promise<T | null>;
	/** Remove data */
	remove(key: string): Promise<void>;
	/** Get all keys */
	getAllKeys(): Promise<string[]>;
	/** Clear storage */
	clear(): Promise<void>;
}

// ============================================================================
// Convenient types for export
// ============================================================================

/** Types for main methods provided by Kizuna manager */
export interface KizunaManagerInterface {
	/** Process interaction */
	processInteraction(context: PointContext): Promise<PointResult>;
	/** Get user */
	getUser(userId: string): KizunaUser | null;
	/** Get all users */
	getAllUsers(): KizunaUser[];
	/** Add points */
	addPoints(userId: string, points: number): Promise<PointResult>;
	/** Calculate level */
	calculateLevel(points: number): number;
	/** Get statistics */
	getStats(): Record<string, unknown>;
}
