/**
 * @aituber-onair/kizuna
 *
 * Bond system for AITuber OnAir
 * Point system for managing relationships with users
 */

// Main classes
export { KizunaManager } from './KizunaManager';
export { UserManager } from './UserManager';
export { PointCalculator } from './PointCalculator';
export { BondEvaluator, type ContinuityBucket } from './BondEvaluator';
export { BondContextBuilder } from './context/BondContextBuilder';
export {
  createDefaultKizunaConfig,
  DEFAULT_BOND_STAGES,
} from './defaultConfig';

// Storage providers
export { StorageProvider } from './storage/StorageProvider';
export { LocalStorageProvider } from './storage/LocalStorageProvider';
export {
  ExternalStorageProvider,
  type ExternalStorageAdapter,
  type ExternalStorageConfig,
} from './storage/ExternalStorageProvider';

// Utilities
export {
  detectEnvironment,
  isBrowser,
  isNode,
} from './utils/environmentDetector';
export {
  createDefaultStorageProvider,
  createStorageProvider,
  type StorageProviderOptions,
} from './utils/storageFactory';

// Type definitions
export type {
  // Basic types
  InteractionKind,
  Interaction,
  UserRole,
  UserType,
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
  StorageConfig,
  DevConfig,
  BondStage,
  LevelConfig,
  WarmthConfig,
  ContinuityUnit,
  ContinuityConfig,
  ContinuityStats,
  SessionInfo,
  BondContextLanguage,
  BondContextOptions,
  BondContextTemplate,
  BondContextConfig,
  BondContinuitySnapshot,
  FavoriteEmotion,
  BondSnapshot,
  // Events
  KizunaEventType,
  KizunaEventData,
  // Interfaces
  KizunaManagerInterface,
  StorageProvider as IStorageProvider,
} from './types';

// Version information
export const version = '0.0.3';
