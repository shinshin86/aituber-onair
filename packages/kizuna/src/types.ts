/** Interaction kinds understood by the default bond configuration. */
export type InteractionKind =
  | 'message'
  | 'reaction'
  | 'gift'
  | 'presence'
  | 'touch'
  | (string & {});

export type InteractionValence = 'positive' | 'neutral' | 'negative';

export type NegativeSeverity = 'light' | 'grave';

/** A contact between an application user and an AI character. */
export interface Interaction {
  userId: string;
  kind: InteractionKind;
  message?: string;
  emotion?: string;
  valence?: InteractionValence;
  severity?: NegativeSeverity;
  isOwner: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** @deprecated Use Interaction. */
export type PointContext = Interaction;

export type UserRole = 'owner' | 'guest';

/** @deprecated Use UserRole. */
export type UserType = UserRole;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ContinuityStats {
  streak: number;
  totalActiveBuckets: number;
  lastContactAt: Date;
  lastBucketKey: string;
  lastBucketIndex?: number;
}

export interface UserStats {
  totalInteractions: number;
  totalPointsEarned: number;
  continuity: ContinuityStats;
  favoriteEmotions: Record<string, number>;
  lastPointsEarned?: Date;
  interactionHistory?: InteractionRecord[];
  dynamics?: BondDynamicsState;
}

export type BondTrend = 'rising' | 'steady' | 'falling' | 'repairing';

export type BondAtmosphere = 'warm' | 'neutral' | 'cool' | 'cold';

export interface BondScar {
  id: string;
  summary: string;
  createdAt: Date;
  healedAt?: Date;
}

export interface BondDynamicsState {
  warmth: number;
  warmthUpdatedAt: Date;
  conflictChilled: boolean;
  trend: BondTrend;
  currentStage: string;
  offenseTimestamps: Date[];
  positiveBucketCounts: Record<string, number>;
  graveBucketKeys: string[];
  positiveInteractionsSinceScar: number;
  positiveBucketKeysSinceScar: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  icon?: string;
}

export interface InteractionRecord {
  id: string;
  timestamp: Date;
  points: number;
  message?: string;
  emotion?: string;
  kind: InteractionKind;
  appliedRules: string[];
  valence?: InteractionValence;
  severity?: NegativeSeverity;
}

export interface KizunaUser {
  id: string;
  displayName: string;
  role: UserRole;
  points: number;
  level: number;
  achievements: Achievement[];
  scars?: BondScar[];
  triggeredThresholds: string[];
  stats: UserStats;
  firstSeen: Date;
  lastSeen: Date;
  customData?: Record<string, unknown>;
}

export interface PointRule {
  id: string;
  name: string;
  condition: (interaction: Interaction, user?: KizunaUser) => boolean;
  points: number | ((interaction: Interaction, user?: KizunaUser) => number);
  cooldown?: number;
  bucketLimit?: number;
  valence?: InteractionValence;
  severity?: NegativeSeverity;
  description?: string;
}

export interface PointResult {
  pointsAdded: number;
  totalPoints: number;
  appliedRules: PointRule[];
  triggeredActions: ThresholdAction[];
  leveledUp: boolean;
  newLevel?: number;
}

export type ActionType =
  | 'special_response'
  | 'unlock_emotion'
  | 'achievement'
  | 'level_up'
  | 'custom';

export interface ThresholdAction {
  type: ActionType;
  data: Record<string, unknown>;
  executedAt?: Date;
}

export interface Threshold {
  id?: string;
  points: number;
  action: ThresholdAction;
  repeatable: boolean;
  description?: string;
}

export interface BondStage {
  id: string;
  minPoints: number;
  label?: string;
}

export interface LevelConfig {
  pointsPerLevel: number;
  maxLevel: number;
}

export interface WarmthConfig {
  halfLifeMs: number;
  floor: number;
}

export type BondDynamicsPreset = 'human' | 'forgiving' | 'strict';

export interface BondDynamicsConfig {
  preset?: BondDynamicsPreset;
  negativityBias?: number;
  offenseWindowMs?: number;
  firstOffenseMultiplier?: number;
  secondOffenseMultiplier?: number;
  repeatedOffenseMultiplier?: number;
  maxEscalationMultiplier?: number;
  stageBuffers?: Record<string, number>;
  graveBaseDamage?: number;
  positiveRepeatMultiplier?: number;
  consistencyBonusPerBucket?: number;
  maxConsistencyBonus?: number;
  giftWarmthThreshold?: number;
  lowWarmthGiftMultiplier?: number;
  lightWarmthPenalty?: number;
  graveWarmthPenalty?: number;
  conflictRecoveryRate?: number;
  reunionRecoveryByStage?: Record<string, number>;
  demotionHysteresis?: number;
  scarHealingPositiveInteractions?: number;
  scarHealingPositiveBuckets?: number;
  maxTrackedBuckets?: number;
}

export interface SessionInfo {
  id: string;
  index: number;
}

export type ContinuityUnit =
  | 'day'
  | 'week'
  | 'session'
  | ((interaction: Interaction, session?: SessionInfo) => number);

export interface ContinuityConfig {
  unit: ContinuityUnit;
  grace?: number;
}

export interface OwnerConfig {
  initialPoints: number;
  pointMultiplier: number;
  exclusiveAchievements: string[];
  firstContactBonus: number;
}

export interface StorageConfig {
  maxUsers: number;
  dataRetentionDays: number;
  cleanupIntervalHours: number;
}

export interface DevConfig {
  debugMode: boolean;
  logLevel: LogLevel;
  showDebugPanel: boolean;
}

export type BondContextLanguage = 'en' | 'ja';

export interface BondContextOptions {
  language?: BondContextLanguage;
  maxFavoriteEmotions?: number;
}

export type BondContextTemplate = (snapshot: BondSnapshot) => string;

export interface BondContextConfig {
  defaultLanguage?: BondContextLanguage;
  templates?: Partial<Record<BondContextLanguage, BondContextTemplate>>;
}

export interface KizunaConfig {
  enabled: boolean;
  owner: OwnerConfig;
  basePoints: Record<string, number>;
  rules: PointRule[];
  thresholds: Threshold[];
  storage: StorageConfig;
  dev: DevConfig;
  warmth?: WarmthConfig;
  continuity?: ContinuityConfig;
  stages?: BondStage[];
  levels?: LevelConfig;
  context?: BondContextConfig;
  dynamics?: BondDynamicsConfig;
  now?: () => number;
}

export interface BondContinuitySnapshot {
  streak: number;
  totalActiveBuckets: number;
  lastContactAt: Date;
}

export interface FavoriteEmotion {
  emotion: string;
  count: number;
}

export interface BondSnapshot {
  userId: string;
  displayName: string;
  role: UserRole;
  stage: string;
  level: number;
  points: number;
  warmth: number;
  trend: BondTrend;
  atmosphere: BondAtmosphere;
  continuity: BondContinuitySnapshot;
  favoriteEmotions: FavoriteEmotion[];
  firstSeen: Date;
  lastSeen: Date;
  achievements: Achievement[];
  scars: BondScar[];
}

export type KizunaEventType =
  | 'points_updated'
  | 'level_up'
  | 'stage_down'
  | 'scar_created'
  | 'scar_healed'
  | 'threshold_reached'
  | 'achievement_earned'
  | 'user_created'
  | 'user_updated'
  | 'action_executed'
  | 'error';

export interface KizunaEventData {
  type: KizunaEventType;
  userId: string;
  data: unknown;
  timestamp: Date;
}

export interface StorageProvider {
  save(key: string, data: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface KizunaManagerInterface {
  processInteraction(interaction: Interaction): Promise<PointResult>;
  getUser(userId: string): KizunaUser | null;
  getAllUsers(): KizunaUser[];
  addPoints(userId: string, points: number): Promise<PointResult>;
  calculateLevel(points: number): number;
  getStats(): Record<string, unknown>;
  getBondSnapshot(userId: string): BondSnapshot | null;
  getBondContext(userId: string, options?: BondContextOptions): string;
  toRelationshipCapital(userId: string): number;
  beginSession(id?: string): Promise<string | null>;
  endSession(): void;
  destroy(): void;
}
