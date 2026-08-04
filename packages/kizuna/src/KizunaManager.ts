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
  Threshold,
  ThresholdAction,
  Achievement,
  KizunaEventType,
  KizunaEventData,
  KizunaManagerInterface,
  StorageProvider,
} from './types';
import { PointCalculator } from './PointCalculator';
import { UserManager } from './UserManager';

interface TriggeredThreshold {
  threshold: Threshold;
  action: ThresholdAction;
  achievement?: Achievement;
}

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
  private userManager: UserManager;
  private storageProvider: StorageProvider | null = null;
  private isInitialized = false;
  private pointCalculator: PointCalculator;
  private storageKey: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private initializationPromise: Promise<void> | null = null;
  private lifecycleVersion = 0;

  constructor(
    config: KizunaConfig,
    storageProvider?: StorageProvider,
    storageKey?: string,
  ) {
    super();
    this.config = { ...config };
    this.storageProvider = storageProvider || null;
    this.userManager = new UserManager(this.config);
    this.pointCalculator = new PointCalculator(this.config);

    if (!storageKey) {
      throw new Error(
        'storageKey is required for KizunaManager. Please provide a complete localStorage key.',
      );
    }
    this.storageKey = storageKey;

    if (this.config.dev.debugMode) {
      console.log(
        '[Kizuna] KizunaManager initialized with config:',
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

    if (!this.initializationPromise) {
      const initialization = this.performInitialization(this.lifecycleVersion);
      const sharedInitialization = initialization.finally(() => {
        if (this.initializationPromise === sharedInitialization) {
          this.initializationPromise = null;
        }
      });
      this.initializationPromise = sharedInitialization;
    }

    return this.initializationPromise;
  }

  /**
   * Run the shared initialization sequence
   */
  private async performInitialization(lifecycleVersion: number): Promise<void> {
    try {
      if (this.storageProvider) {
        await this.loadFromStorage();
      }

      if (lifecycleVersion !== this.lifecycleVersion) {
        throw new Error('KizunaManager initialization was cancelled');
      }

      this.setupAutoCleanup();
      this.isInitialized = true;
      this.log('info', 'KizunaManager initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize KizunaManager:', error);
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
          'debug',
          `Processing interaction for ${context.userId} with emotion: ${context.emotion}`,
        );
      }

      // Get or create user
      const userCount = this.userManager.getUserCount();
      const user = this.userManager.getOrCreateUser(context);
      if (this.userManager.getUserCount() > userCount) {
        this.emitEvent('user_created', { userId: user.id, user });
        this.log('info', `New user created: ${user.id}`);
      }

      // Calculate points
      const calculationResult = this.calculatePoints(context, user);

      // Add points
      const result = await this.addPoints(
        user.id,
        calculationResult.points,
        context,
        calculationResult.appliedRules,
      );

      // Add interaction record
      this.userManager.addInteractionRecord(
        user.id,
        context,
        result.pointsAdded,
        result.appliedRules.map((rule) => rule.id),
      );

      // Save to storage
      if (this.storageProvider) {
        await this.saveToStorage();
      }

      if (this.config.dev.debugMode) {
        this.log(
          'debug',
          `Interaction processed: ${result.pointsAdded} points added (${result.appliedRules.length} rules applied)`,
        );
        if (result.appliedRules.length > 0) {
          this.log(
            'debug',
            `Applied rules: ${result.appliedRules.map((r) => r.name).join(', ')}`,
          );
        }
      }

      return result;
    } catch (error) {
      this.log('error', 'Error processing interaction:', error);
      this.emitEvent('error', { error, context });
      throw error;
    }
  }

  /**
   * Get user
   */
  getUser(userId: string): KizunaUser | null {
    return this.userManager.getUser(userId);
  }

  /**
   * Get all users
   */
  getAllUsers(): KizunaUser[] {
    return this.userManager.getAllUsers();
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
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const oldPoints = user.points;
    const oldLevel = user.level;

    user.points += points;
    user.lastSeen = new Date();
    user.stats.totalPointsEarned += Math.max(0, points); // Don't include negative points in statistics
    if (points > 0) {
      user.stats.lastPointsEarned = new Date();
    }

    // Calculate level
    const newLevel = this.calculateLevel(user.points);
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      user.level = newLevel;
    }

    const triggeredThresholds = this.checkThresholds(user);

    const result: PointResult = {
      pointsAdded: points,
      totalPoints: user.points,
      appliedRules: appliedRules || [],
      triggeredActions: triggeredThresholds.map(({ action }) => action),
      leveledUp,
      ...(leveledUp && { newLevel }),
    };

    // Emit event
    this.emitEvent('points_updated', {
      userId,
      oldPoints,
      newPoints: user.points,
      pointsAdded: points,
    });

    if (leveledUp) {
      this.emitEvent('level_up', {
        userId,
        oldLevel,
        newLevel,
      });
    }

    for (const { threshold, achievement } of triggeredThresholds) {
      this.emitEvent('threshold_reached', {
        userId: user.id,
        threshold,
        user,
      });

      if (achievement) {
        this.emitEvent('achievement_earned', {
          userId: user.id,
          achievement,
          user,
        });
      }
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
      ownerUsers: users.filter((user) => user.type === 'owner').length,
      activeToday: users.filter((user) => {
        const today = new Date();
        const lastSeen = new Date(user.lastSeen);
        return lastSeen.toDateString() === today.toDateString();
      }).length,
    };
  }

  /**
   * Release resources owned by this manager
   */
  destroy(): void {
    this.lifecycleVersion++;
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
    this.isInitialized = false;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

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
   * Check and execute point thresholds
   */
  private checkThresholds(user: KizunaUser): TriggeredThreshold[] {
    const triggeredThresholds: TriggeredThreshold[] = [];

    for (const threshold of this.config.thresholds) {
      const thresholdId = threshold.id ?? this.createThresholdId(threshold);
      const hasTriggered = user.triggeredThresholds.includes(thresholdId);

      if (
        user.points < threshold.points ||
        (!threshold.repeatable && hasTriggered)
      ) {
        continue;
      }

      const action: ThresholdAction = {
        ...threshold.action,
        executedAt: new Date(),
      };
      const triggered: TriggeredThreshold = { threshold, action };

      if (action.type === 'achievement') {
        const achievement = this.createAchievement(action);
        if (!achievement) {
          continue;
        }
        if (this.userManager.grantAchievement(user.id, achievement)) {
          triggered.achievement =
            user.achievements.find((item) => item.id === achievement.id) ??
            achievement;
        }
      }

      if (!hasTriggered) {
        user.triggeredThresholds.push(thresholdId);
      }

      triggeredThresholds.push(triggered);
    }

    return triggeredThresholds;
  }

  /**
   * Create a configuration-stable identifier for thresholds without an ID
   */
  private createThresholdId(threshold: Threshold): string {
    const signature = this.stableSerialize({
      points: threshold.points,
      action: threshold.action,
    });
    let hash = 2166136261;
    for (let index = 0; index < signature.length; index++) {
      hash ^= signature.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `threshold_${(hash >>> 0).toString(36)}`;
  }

  /**
   * Serialize configuration data with deterministic object key ordering
   */
  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableSerialize(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(item)}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value) ?? String(value);
  }

  /**
   * Create a validated achievement from threshold action data
   */
  private createAchievement(action: ThresholdAction): Achievement | null {
    const { id, title, description, icon } = action.data;
    if (
      typeof id !== 'string' ||
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      (icon !== undefined && typeof icon !== 'string')
    ) {
      this.log('warn', 'Ignoring invalid achievement threshold data');
      return null;
    }

    return {
      id,
      title,
      description,
      earnedAt: new Date(),
      ...(icon && { icon }),
    };
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
        const result = this.userManager.importUsers(JSON.stringify(userData));
        if (result.errors.length > 0) {
          this.log('warn', 'Some users could not be loaded:', result.errors);
        }
        this.log('info', `Loaded ${result.imported} users from storage`);
      }
    } catch (error) {
      this.log('error', 'Failed to load from storage:', error);
    }
  }

  /**
   * Save data to storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storageProvider) return;

    try {
      const userData = Object.fromEntries(this.userManager.getUsersAsMap());
      await this.storageProvider.save(this.storageKey, userData);
      this.log('debug', 'Data saved to storage');
    } catch (error) {
      this.log('error', 'Failed to save to storage:', error);
    }
  }

  /**
   * Set up automatic cleanup
   */
  private setupAutoCleanup(): void {
    const intervalMs =
      this.config.storage.cleanupIntervalHours * 60 * 60 * 1000;

    this.cleanupInterval = setInterval(() => {
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

    for (const user of this.userManager.getAllUsers()) {
      // Don't delete owners
      if (user.type === 'owner') continue;

      // Delete users who exceed retention period
      if (now - new Date(user.lastSeen).getTime() > retentionMs) {
        this.userManager.deleteUser(user.id);
        cleanedCount++;
      }
    }

    // If max users exceeded, delete oldest users first
    const users = this.userManager.getAllUsers();
    if (users.length > this.config.storage.maxUsers) {
      const sortedUsers = users
        .filter((user) => user.type !== 'owner')
        .sort(
          (a, b) =>
            new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime(),
        );

      const toDelete = sortedUsers.slice(
        0,
        users.length - this.config.storage.maxUsers,
      );
      for (const user of toDelete) {
        this.userManager.deleteUser(user.id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.log('info', `Cleaned up ${cleanedCount} users`);
    }
  }

  /**
   * Emit event
   */
  private emitEvent(type: KizunaEventType, data: unknown): void {
    const eventData: KizunaEventData = {
      type,
      userId: (data as { userId?: string })?.userId || '',
      data,
      timestamp: new Date(),
    };

    this.emit(type, eventData);
  }

  /**
   * Log output
   */
  private log(
    level: import('./types').LogLevel,
    message: string,
    ...args: unknown[]
  ): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[Kizuna ${timestamp}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  /**
   * Check log level
   */
  private shouldLog(level: import('./types').LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.config.dev.logLevel);
    const messageLevel = levels.indexOf(level);

    return messageLevel >= currentLevel;
  }
}
