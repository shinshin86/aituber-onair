/**
 * @aituber-onair/kizuna
 *
 * Bond system for AITuber OnAir
 * Point system for managing relationships with users
 */

// Main classes
export { KizunaManager } from './KizunaManager.js';
export { UserManager } from './UserManager.js';
export { PointCalculator } from './PointCalculator.js';
export { BondEvaluator, type ContinuityBucket } from './BondEvaluator.js';
export {
  BondDynamics,
  type BondDynamicsEvaluation,
} from './BondDynamics.js';
export { BondContextBuilder } from './context/BondContextBuilder.js';
export {
  createDefaultKizunaConfig,
  DEFAULT_BOND_STAGES,
} from './defaultConfig.js';

// Storage providers
export { StorageProvider } from './storage/StorageProvider.js';
export { LocalStorageProvider } from './storage/LocalStorageProvider.js';
export {
  ExternalStorageProvider,
  type ExternalStorageAdapter,
  type ExternalStorageConfig,
} from './storage/ExternalStorageProvider.js';

// Utilities
export {
  detectEnvironment,
  isBrowser,
  isNode,
} from './utils/environmentDetector.js';
export {
  createDefaultStorageProvider,
  createStorageProvider,
  type StorageProviderOptions,
} from './utils/storageFactory.js';

// Type definitions
export type {
  // Basic types
  InteractionKind,
  Interaction,
  InteractionValence,
  NegativeSeverity,
  UserRole,
  UserType,
  LogLevel,
  // User-related
  KizunaUser,
  UserStats,
  Achievement,
  InteractionRecord,
  BondScar,
  BondDynamicsState,
  BondTrend,
  BondAtmosphere,
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
  BondDynamicsPreset,
  BondDynamicsConfig,
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
} from './types.js';

// Version information
export const version = '0.0.4';
