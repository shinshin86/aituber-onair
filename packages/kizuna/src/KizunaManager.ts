import { BondEvaluator } from './BondEvaluator';
import { BondContextBuilder } from './context/BondContextBuilder';
import { PointCalculator, type PersistedLimitRecord } from './PointCalculator';
import type {
  Achievement,
  BondContextOptions,
  BondSnapshot,
  Interaction,
  KizunaConfig,
  KizunaEventData,
  KizunaEventType,
  KizunaManagerInterface,
  KizunaUser,
  PointResult,
  PointRule,
  SessionInfo,
  StorageProvider,
  Threshold,
  ThresholdAction,
} from './types';
import { UserManager } from './UserManager';

interface TriggeredThreshold {
  threshold: Threshold;
  action: ThresholdAction;
  achievement?: Achievement;
}

interface PersistenceEnvelope {
  format: '@aituber-onair/kizuna';
  version: 1;
  users: Record<string, unknown>;
  sessionCounter: number;
  limitRecords: PersistedLimitRecord[];
}

class EventEmitter {
  private listeners = new Map<string, ((...arguments_: unknown[]) => void)[]>();

  on(event: string, listener: (...arguments_: unknown[]) => void): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: (...arguments_: unknown[]) => void): void {
    const listeners = this.listeners.get(event);
    const index = listeners?.indexOf(listener) ?? -1;
    if (index >= 0) listeners?.splice(index, 1);
  }

  emit(event: string, data?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export class KizunaManager
  extends EventEmitter
  implements KizunaManagerInterface
{
  private readonly userManager: UserManager;
  private readonly pointCalculator: PointCalculator;
  private readonly bondEvaluator: BondEvaluator;
  private readonly contextBuilder: BondContextBuilder;
  private readonly now: () => number;
  private readonly storageProvider: StorageProvider | null;
  private readonly storageKey: string;
  private isInitialized = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private initializationPromise: Promise<void> | null = null;
  private lifecycleVersion = 0;
  private activeSession: SessionInfo | undefined;
  private sessionCounter = 0;
  private storageWriteQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: KizunaConfig,
    storageProvider?: StorageProvider,
    storageKey?: string,
  ) {
    super();
    if (!storageKey) {
      throw new Error(
        'storageKey is required for KizunaManager. Please provide a complete storage key.',
      );
    }
    this.storageKey = storageKey;
    this.storageProvider = storageProvider ?? null;
    this.now = config.now ?? Date.now;
    this.bondEvaluator = new BondEvaluator(config);
    this.userManager = new UserManager(config, this.bondEvaluator);
    this.pointCalculator = new PointCalculator(config, this.bondEvaluator);
    this.contextBuilder = new BondContextBuilder(config.context);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
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

  async processInteraction(interaction: Interaction): Promise<PointResult> {
    if (!this.isInitialized) await this.initialize();
    try {
      const previousUserCount = this.userManager.getUserCount();
      const existingUser = this.userManager.getUser(interaction.userId);
      const bucket = this.bondEvaluator.resolveBucket(
        interaction,
        this.activeSession,
      );
      const previousContinuity = existingUser?.stats.continuity;
      const isNewerBucket =
        bucket.index === undefined ||
        previousContinuity?.lastBucketIndex === undefined ||
        bucket.index > previousContinuity.lastBucketIndex;
      const isFirstContactInBucket =
        !previousContinuity ||
        (bucket.key !== previousContinuity.lastBucketKey && isNewerBucket);
      const user = this.userManager.getOrCreateUser(
        interaction,
        this.activeSession,
      );
      if (this.userManager.getUserCount() > previousUserCount) {
        this.emitEvent('user_created', { userId: user.id, user });
      }

      const calculation = this.pointCalculator.calculatePoints(
        interaction,
        user,
        this.activeSession,
        isFirstContactInBucket,
      );
      const result = await this.addPoints(
        user.id,
        calculation.points,
        interaction,
        calculation.appliedRules,
      );
      this.userManager.addInteractionRecord(
        user.id,
        interaction,
        result.pointsAdded,
        result.appliedRules.map(({ id }) => id),
      );
      if (this.storageProvider) await this.saveToStorage();
      return result;
    } catch (error) {
      this.emitEvent('error', { error, interaction });
      throw error;
    }
  }

  getUser(userId: string): KizunaUser | null {
    return this.userManager.getUser(userId);
  }

  getAllUsers(): KizunaUser[] {
    return this.userManager.getAllUsers();
  }

  async addPoints(
    userId: string,
    points: number,
    interaction?: Interaction,
    appliedRules: PointRule[] = [],
  ): Promise<PointResult> {
    const user = this.userManager.getUser(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const oldPoints = user.points;
    const oldLevel = user.level;
    const occurredAt = interaction?.timestamp ?? this.now();
    const pointsAdded = Number.isFinite(points) ? Math.max(0, points) : 0;
    user.points += pointsAdded;
    if (occurredAt > user.lastSeen.getTime()) {
      user.lastSeen = new Date(occurredAt);
    }
    user.stats.totalPointsEarned += pointsAdded;
    if (
      pointsAdded > 0 &&
      (!user.stats.lastPointsEarned ||
        occurredAt > user.stats.lastPointsEarned.getTime())
    ) {
      user.stats.lastPointsEarned = new Date(occurredAt);
    }

    const newLevel = this.calculateLevel(user.points);
    const leveledUp = newLevel > oldLevel;
    user.level = newLevel;
    const triggeredThresholds = this.checkThresholds(user, oldPoints);
    const result: PointResult = {
      pointsAdded,
      totalPoints: user.points,
      appliedRules,
      triggeredActions: triggeredThresholds.map(({ action }) => action),
      leveledUp,
      ...(leveledUp && { newLevel }),
    };

    this.emitEvent('points_updated', {
      userId,
      oldPoints,
      newPoints: user.points,
      pointsAdded,
    });
    if (leveledUp) {
      this.emitEvent('level_up', { userId, oldLevel, newLevel });
    }
    for (const { threshold, achievement } of triggeredThresholds) {
      this.emitEvent('threshold_reached', { userId, threshold, user });
      if (achievement) {
        this.emitEvent('achievement_earned', {
          userId,
          achievement,
          user,
        });
      }
    }
    return result;
  }

  calculateLevel(points: number): number {
    return this.bondEvaluator.calculateLevel(points);
  }

  getStats(): Record<string, unknown> {
    const users = this.getAllUsers();
    const today = new Date(this.now()).toDateString();
    return {
      totalUsers: users.length,
      totalPoints: users.reduce((sum, user) => sum + user.points, 0),
      averageLevel:
        users.reduce((sum, user) => sum + user.level, 0) / users.length || 0,
      ownerUsers: users.filter(({ role }) => role === 'owner').length,
      activeToday: users.filter(
        ({ lastSeen }) => lastSeen.toDateString() === today,
      ).length,
    };
  }

  getBondSnapshot(userId: string): BondSnapshot | null {
    const user = this.userManager.getUser(userId);
    if (!user) return null;
    return {
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
      stage: this.bondEvaluator.resolveStage(user.points).id,
      level: user.level,
      points: user.points,
      warmth: this.bondEvaluator.calculateWarmth(
        user.stats.continuity.lastContactAt,
      ),
      continuity: {
        streak: user.stats.continuity.streak,
        totalActiveBuckets: user.stats.continuity.totalActiveBuckets,
        lastContactAt: new Date(user.stats.continuity.lastContactAt),
      },
      favoriteEmotions: Object.entries(user.stats.favoriteEmotions)
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((left, right) => right.count - left.count),
      firstSeen: new Date(user.firstSeen),
      lastSeen: new Date(user.lastSeen),
      achievements: user.achievements.map((achievement) => ({
        ...achievement,
        earnedAt: new Date(achievement.earnedAt),
      })),
    };
  }

  getBondContext(userId: string, options: BondContextOptions = {}): string {
    const snapshot = this.getBondSnapshot(userId);
    return snapshot ? this.contextBuilder.build(snapshot, options) : '';
  }

  toRelationshipCapital(userId: string): number {
    const snapshot = this.getBondSnapshot(userId);
    return snapshot
      ? this.bondEvaluator.normalizePoints(snapshot.points) * snapshot.warmth
      : 0;
  }

  async beginSession(id?: string): Promise<string | null> {
    if (this.config.continuity?.unit !== 'session') return null;
    if (!this.isInitialized) await this.initialize();
    this.sessionCounter++;
    const session: SessionInfo = {
      id: id ?? `session_${this.sessionCounter}_${this.now()}`,
      index: this.sessionCounter,
    };
    this.activeSession = session;
    if (this.storageProvider) await this.saveToStorage();
    return session.id;
  }

  endSession(): void {
    if (this.config.continuity?.unit === 'session') {
      this.activeSession = undefined;
    }
  }

  destroy(): void {
    this.lifecycleVersion++;
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.activeSession = undefined;
    this.removeAllListeners();
    this.isInitialized = false;
  }

  private async performInitialization(lifecycleVersion: number): Promise<void> {
    if (this.storageProvider) await this.loadFromStorage();
    if (lifecycleVersion !== this.lifecycleVersion) {
      throw new Error('KizunaManager initialization was cancelled');
    }
    this.setupAutoCleanup();
    this.isInitialized = true;
  }

  private checkThresholds(
    user: KizunaUser,
    oldPoints: number,
  ): TriggeredThreshold[] {
    const triggeredThresholds: TriggeredThreshold[] = [];
    for (const threshold of this.config.thresholds) {
      const thresholdId = threshold.id ?? this.createThresholdId(threshold);
      const hasTriggered = user.triggeredThresholds.includes(thresholdId);
      if (
        oldPoints >= threshold.points ||
        user.points < threshold.points ||
        (!threshold.repeatable && hasTriggered)
      ) {
        continue;
      }

      const action: ThresholdAction = {
        ...threshold.action,
        executedAt: new Date(this.now()),
      };
      const triggered: TriggeredThreshold = { threshold, action };
      if (action.type === 'achievement') {
        const achievement = this.createAchievement(action);
        if (!achievement) continue;
        if (this.userManager.grantAchievement(user.id, achievement)) {
          triggered.achievement =
            user.achievements.find(({ id }) => id === achievement.id) ??
            achievement;
        }
      }
      if (!hasTriggered) user.triggeredThresholds.push(thresholdId);
      triggeredThresholds.push(triggered);
    }
    return triggeredThresholds;
  }

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

  private stableSerialize(
    value: unknown,
    seen = new WeakSet<object>(),
  ): string {
    if (Array.isArray(value)) {
      if (seen.has(value)) return '"[Circular]"';
      seen.add(value);
      const serialized = `[${value
        .map((item) => this.stableSerialize(item, seen))
        .join(',')}]`;
      seen.delete(value);
      return serialized;
    }
    if (value && typeof value === 'object') {
      if (value instanceof Date) return JSON.stringify(value.toISOString());
      if (seen.has(value)) return '"[Circular]"';
      seen.add(value);
      const serialized = `{${Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(item, seen)}`,
        )
        .join(',')}}`;
      seen.delete(value);
      return serialized;
    }
    if (typeof value === 'bigint') return JSON.stringify(`${value}n`);
    return JSON.stringify(value) ?? String(value);
  }

  private createAchievement(action: ThresholdAction): Achievement | null {
    const { id, title, description, icon } = action.data;
    if (
      typeof id !== 'string' ||
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      (icon !== undefined && typeof icon !== 'string')
    ) {
      return null;
    }
    return {
      id,
      title,
      description,
      earnedAt: new Date(this.now()),
      ...(icon && { icon }),
    };
  }

  private async loadFromStorage(): Promise<void> {
    if (!this.storageProvider) return;
    try {
      const data = await this.storageProvider.load<unknown>(this.storageKey);
      if (!data) return;
      if (this.isPersistenceEnvelope(data)) {
        this.userManager.importUsers(JSON.stringify(data.users));
        this.sessionCounter = data.sessionCounter;
        this.pointCalculator.importLimitRecords(data.limitRecords);
      } else if (typeof data === 'object' && !Array.isArray(data)) {
        this.userManager.importUsers(JSON.stringify(data));
      }
      this.restoreSessionCounter();
    } catch (error) {
      this.log('error', 'Failed to load from storage:', error);
    }
  }

  private restoreSessionCounter(): void {
    if (this.config.continuity?.unit !== 'session') return;
    const lastStoredIndex = this.userManager
      .getAllUsers()
      .reduce(
        (maximum, user) =>
          Math.max(maximum, user.stats.continuity.lastBucketIndex ?? maximum),
        0,
      );
    this.sessionCounter = Math.max(this.sessionCounter, lastStoredIndex);
    const activeSession = this.activeSession;
    if (activeSession && activeSession.index <= lastStoredIndex) {
      this.sessionCounter++;
      activeSession.index = this.sessionCounter;
    }
  }

  private async saveToStorage(): Promise<void> {
    if (!this.storageProvider) return;
    let snapshot: PersistenceEnvelope;
    try {
      snapshot = JSON.parse(
        JSON.stringify({
          format: '@aituber-onair/kizuna',
          version: 1,
          users: Object.fromEntries(this.userManager.getUsersAsMap()),
          sessionCounter: this.sessionCounter,
          limitRecords: this.pointCalculator.exportLimitRecords(),
        } satisfies PersistenceEnvelope),
      ) as PersistenceEnvelope;
    } catch (error) {
      this.log('error', 'Failed to prepare storage snapshot:', error);
      return;
    }

    const write = this.storageWriteQueue.then(async () => {
      try {
        await this.storageProvider?.save(this.storageKey, snapshot);
      } catch (error) {
        this.log('error', 'Failed to save to storage:', error);
      }
    });
    this.storageWriteQueue = write;
    await write;
  }

  private isPersistenceEnvelope(value: unknown): value is PersistenceEnvelope {
    if (!value || typeof value !== 'object') return false;
    const envelope = value as Record<string, unknown>;
    return (
      envelope.format === '@aituber-onair/kizuna' &&
      envelope.version === 1 &&
      Boolean(envelope.users) &&
      typeof envelope.users === 'object' &&
      !Array.isArray(envelope.users) &&
      typeof envelope.sessionCounter === 'number' &&
      Number.isFinite(envelope.sessionCounter) &&
      envelope.sessionCounter >= 0 &&
      Array.isArray(envelope.limitRecords)
    );
  }

  private setupAutoCleanup(): void {
    const intervalMs =
      this.config.storage.cleanupIntervalHours * 60 * 60 * 1_000;
    this.cleanupInterval = setInterval(() => this.performCleanup(), intervalMs);
  }

  private performCleanup(): void {
    const retentionMs =
      this.config.storage.dataRetentionDays * 24 * 60 * 60 * 1_000;
    for (const user of this.userManager.getAllUsers()) {
      if (
        user.role !== 'owner' &&
        this.now() - user.lastSeen.getTime() > retentionMs
      ) {
        this.userManager.deleteUser(user.id);
      }
    }

    const users = this.userManager.getAllUsers();
    const excess = users.length - this.config.storage.maxUsers;
    if (excess <= 0) return;
    const oldestGuests = users
      .filter(({ role }) => role !== 'owner')
      .sort((left, right) => left.lastSeen.getTime() - right.lastSeen.getTime())
      .slice(0, excess);
    for (const user of oldestGuests) this.userManager.deleteUser(user.id);
  }

  private emitEvent(type: KizunaEventType, data: unknown): void {
    const event: KizunaEventData = {
      type,
      userId: (data as { userId?: string })?.userId ?? '',
      data,
      timestamp: new Date(this.now()),
    };
    this.emit(type, event);
  }

  private log(
    level: import('./types').LogLevel,
    message: string,
    ...arguments_: unknown[]
  ): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.config.dev.logLevel))
      return;
    const prefix = `[Kizuna ${new Date(this.now()).toISOString()}]`;
    console[level](prefix, message, ...arguments_);
  }
}
