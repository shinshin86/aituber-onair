import type { BondEvaluator } from './BondEvaluator';
import type {
  Achievement,
  Interaction,
  InteractionRecord,
  KizunaConfig,
  KizunaUser,
  SessionInfo,
  UserRole,
  UserStats,
} from './types';

export class UserManager {
  private users = new Map<string, KizunaUser>();
  private readonly now: () => number;

  constructor(
    private readonly config: KizunaConfig,
    private readonly bondEvaluator: BondEvaluator,
  ) {
    this.now = config.now ?? Date.now;
  }

  getOrCreateUser(interaction: Interaction, session?: SessionInfo): KizunaUser {
    let user = this.users.get(interaction.userId);
    if (!user) {
      user = this.createUser(interaction, session);
      this.users.set(user.id, user);
      this.log(`New user created: ${user.id} (${user.displayName})`);
    } else {
      this.updateUserActivity(user, interaction, session);
    }
    return user;
  }

  getUser(userId: string): KizunaUser | null {
    return this.users.get(userId) ?? null;
  }

  getAllUsers(): KizunaUser[] {
    return Array.from(this.users.values());
  }

  getUserCount(): number {
    return this.users.size;
  }

  getUserCountByRole(): Record<UserRole, number> {
    const counts: Record<UserRole, number> = { owner: 0, guest: 0 };
    for (const user of this.users.values()) counts[user.role]++;
    return counts;
  }

  getActiveUsers(hours = 24): KizunaUser[] {
    const cutoffTime = this.now() - hours * 60 * 60 * 1_000;
    return this.getAllUsers().filter(
      (user) => user.lastSeen.getTime() > cutoffTime,
    );
  }

  getTopUsers(limit = 10): KizunaUser[] {
    return this.getAllUsers()
      .sort((left, right) => right.points - left.points)
      .slice(0, limit);
  }

  deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user || user.role === 'owner') return false;
    return this.users.delete(userId);
  }

  grantAchievement(userId: string, achievement: Achievement): boolean {
    const user = this.users.get(userId);
    if (!user || user.achievements.some(({ id }) => id === achievement.id)) {
      return false;
    }
    user.achievements.push({ ...achievement, earnedAt: new Date(this.now()) });
    return true;
  }

  addInteractionRecord(
    userId: string,
    interaction: Interaction,
    pointsEarned: number,
    appliedRules: string[],
  ): void {
    const user = this.users.get(userId);
    if (!user) return;
    const record: InteractionRecord = {
      id: this.generateInteractionId(),
      timestamp: new Date(interaction.timestamp),
      points: pointsEarned,
      message: interaction.message,
      emotion: interaction.emotion,
      kind: interaction.kind,
      appliedRules,
    };
    user.stats.interactionHistory ??= [];
    user.stats.interactionHistory.push(record);
    if (user.stats.interactionHistory.length > 100) {
      user.stats.interactionHistory = user.stats.interactionHistory.slice(-100);
    }
  }

  exportUsers(): string {
    return JSON.stringify(Object.fromEntries(this.users), null, 2);
  }

  importUsers(jsonData: string): {
    success: boolean;
    imported: number;
    errors: string[];
  } {
    const result = { success: false, imported: 0, errors: [] as string[] };
    try {
      const parsedData = JSON.parse(jsonData) as Record<string, unknown>;
      for (const [userId, userData] of Object.entries(parsedData)) {
        try {
          this.users.set(userId, this.normalizeUser(userId, userData));
          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to import user ${userId}: ${error}`);
        }
      }
      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error}`);
    }
    return result;
  }

  getUsersAsMap(): Map<string, KizunaUser> {
    return new Map(this.users);
  }

  setUsersFromMap(users: Map<string, KizunaUser>): void {
    this.users = new Map(users);
  }

  private createUser(
    interaction: Interaction,
    session?: SessionInfo,
  ): KizunaUser {
    const role: UserRole = interaction.isOwner ? 'owner' : 'guest';
    const points = role === 'owner' ? this.config.owner.initialPoints : 0;
    const user: KizunaUser = {
      id: interaction.userId,
      displayName: this.resolveDisplayName(interaction),
      role,
      points,
      level: this.bondEvaluator.calculateLevel(points),
      achievements: [],
      triggeredThresholds: [],
      stats: this.createInitialStats(interaction, session),
      firstSeen: new Date(interaction.timestamp),
      lastSeen: new Date(interaction.timestamp),
      customData: {},
    };
    if (role === 'owner') this.grantOwnerAchievements(user);
    return user;
  }

  private createInitialStats(
    interaction: Interaction,
    session?: SessionInfo,
  ): UserStats {
    return {
      totalInteractions: 1,
      totalPointsEarned: 0,
      continuity: this.bondEvaluator.createContinuity(interaction, session),
      favoriteEmotions: interaction.emotion ? { [interaction.emotion]: 1 } : {},
      interactionHistory: [],
    };
  }

  private updateUserActivity(
    user: KizunaUser,
    interaction: Interaction,
    session?: SessionInfo,
  ): void {
    if (interaction.timestamp < user.firstSeen.getTime()) {
      user.firstSeen = new Date(interaction.timestamp);
    }
    if (interaction.timestamp > user.lastSeen.getTime()) {
      user.lastSeen = new Date(interaction.timestamp);
    }
    user.stats.totalInteractions++;
    this.bondEvaluator.updateContinuity(
      user.stats.continuity,
      interaction,
      session,
    );
    if (interaction.emotion) {
      user.stats.favoriteEmotions[interaction.emotion] =
        (user.stats.favoriteEmotions[interaction.emotion] ?? 0) + 1;
    }
  }

  private resolveDisplayName(interaction: Interaction): string {
    const candidate =
      interaction.metadata?.displayName ?? interaction.metadata?.userName;
    return typeof candidate === 'string' && candidate.trim()
      ? candidate.trim()
      : interaction.userId;
  }

  private grantOwnerAchievements(user: KizunaUser): void {
    const achievements = [
      {
        id: 'first_adopter',
        title: 'First Adopter',
        description: 'Early adopter of AITuber OnAir',
        icon: '🏆',
      },
      {
        id: 'master_of_aituber',
        title: 'Master of AITuber',
        description: 'Master of AITuber',
        icon: '👑',
      },
    ];
    for (const achievement of achievements) {
      if (this.config.owner.exclusiveAchievements.includes(achievement.id)) {
        user.achievements.push({
          ...achievement,
          earnedAt: new Date(this.now()),
        });
      }
    }
  }

  private normalizeUser(userId: string, userData: unknown): KizunaUser {
    if (!userData || typeof userData !== 'object') {
      throw new Error('Invalid user data: must be an object');
    }
    const data = userData as Record<string, unknown>;
    const stats = (data.stats ?? {}) as Record<string, unknown>;
    const firstSeen = new Date(data.firstSeen as string);
    const lastSeen = new Date(data.lastSeen as string);
    const role: UserRole =
      data.role === 'owner' || data.type === 'owner' ? 'owner' : 'guest';
    const continuity = stats.continuity
      ? this.normalizeContinuity(stats.continuity)
      : this.bondEvaluator.createContinuity({
          userId,
          kind: 'presence',
          isOwner: role === 'owner',
          timestamp: lastSeen.getTime(),
        });

    return {
      id: userId,
      displayName:
        typeof data.displayName === 'string' ? data.displayName : userId,
      role,
      points: Number(data.points ?? 0),
      level: this.bondEvaluator.calculateLevel(Number(data.points ?? 0)),
      achievements: ((data.achievements as unknown[]) ?? []).map((item) => {
        const achievement = item as Achievement;
        return { ...achievement, earnedAt: new Date(achievement.earnedAt) };
      }),
      triggeredThresholds: Array.isArray(data.triggeredThresholds)
        ? (data.triggeredThresholds as string[])
        : [],
      stats: {
        totalInteractions: Number(
          stats.totalInteractions ?? stats.totalMessages ?? 0,
        ),
        totalPointsEarned: Number(stats.totalPointsEarned ?? 0),
        continuity,
        favoriteEmotions:
          (stats.favoriteEmotions as Record<string, number>) ?? {},
        ...(stats.lastPointsEarned
          ? { lastPointsEarned: new Date(stats.lastPointsEarned as string) }
          : {}),
        interactionHistory: ((stats.interactionHistory as unknown[]) ?? []).map(
          (item) => {
            const record = item as Record<string, unknown>;
            return {
              id:
                typeof record.id === 'string'
                  ? record.id
                  : this.generateInteractionId(),
              timestamp: new Date(record.timestamp as string),
              points: Number(record.points ?? 0),
              ...(typeof record.message === 'string' && {
                message: record.message,
              }),
              ...(typeof record.emotion === 'string' && {
                emotion: record.emotion,
              }),
              kind: typeof record.kind === 'string' ? record.kind : 'message',
              appliedRules: Array.isArray(record.appliedRules)
                ? record.appliedRules.filter(
                    (ruleId): ruleId is string => typeof ruleId === 'string',
                  )
                : [],
            };
          },
        ),
      },
      firstSeen,
      lastSeen,
      customData:
        (data.customData as Record<string, unknown> | undefined) ?? {},
    };
  }

  private normalizeContinuity(value: unknown): UserStats['continuity'] {
    const continuity = value as Record<string, unknown>;
    return {
      streak: Number(continuity.streak ?? 1),
      totalActiveBuckets: Number(continuity.totalActiveBuckets ?? 1),
      lastContactAt: new Date(continuity.lastContactAt as string),
      lastBucketKey: String(continuity.lastBucketKey ?? ''),
      ...(typeof continuity.lastBucketIndex === 'number' && {
        lastBucketIndex: continuity.lastBucketIndex,
      }),
    };
  }

  private generateInteractionId(): string {
    return `interaction_${this.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private log(message: string): void {
    if (this.config.dev.debugMode) console.log(`[UserManager] ${message}`);
  }
}
