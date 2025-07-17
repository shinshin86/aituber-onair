/**
 * @aituber-onair/kizuna
 *
 * Bond system for AITuber OnAir
 * Point system for managing relationships with users
 */

// Main classes
export { KizunaManager } from "./KizunaManager";
export { UserManager } from "./UserManager";
export { PointCalculator } from "./PointCalculator";

// Storage providers
export { StorageProvider } from "./storage/StorageProvider";
export { LocalStorageProvider } from "./storage/LocalStorageProvider";
export { FileSystemStorageProvider } from "./storage/FileSystemStorageProvider";

// Utilities
export { generateUserId, parseUserId } from "./utils/userIdGenerator";
export {
	detectEnvironment,
	isBrowser,
	isNode,
} from "./utils/environmentDetector";
export {
	createDefaultStorageProvider,
	createStorageProvider,
} from "./utils/storageFactory";

// Type definitions
export type {
	// Basic types
	UserType,
	ChatType,
	LogLevel,
	// User-related
	KizunaUser,
	UserStats,
	Achievement,
	InteractionRecord,
	// Point system
	PointContext,
	PointRule,
	PointResult,
	// Thresholds and actions
	ActionType,
	ThresholdAction,
	Threshold,
	// Configuration
	KizunaConfig,
	OwnerConfig,
	PlatformPointConfig,
	StorageConfig,
	DevConfig,
	// Events
	KizunaEventType,
	KizunaEventData,
	// Interfaces
	KizunaManagerInterface,
	StorageProvider as IStorageProvider,
} from "./types";

// Version information
export const version = "0.1.0";
