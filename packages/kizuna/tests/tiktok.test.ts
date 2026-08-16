import { describe, expect, it } from 'vitest';
import { UserManager, generateUserId, parseUserId } from '../src/index';
import type { KizunaConfig, PointContext } from '../src/types';

const testConfig: KizunaConfig = {
  enabled: true,
  owner: {
    initialPoints: 0,
    pointMultiplier: 1,
    specialCommands: [],
    exclusiveAchievements: [],
    dailyBonus: 0,
  },
  platforms: {},
  thresholds: [],
  storage: {
    maxUsers: 100,
    dataRetentionDays: 30,
    cleanupIntervalHours: 24,
  },
  dev: {
    debugMode: false,
    logLevel: 'info',
    showDebugPanel: false,
  },
};

describe('TikTok support', () => {
  it('generates and parses TikTok user ids', () => {
    const userId = generateUserId('tiktok', '@hana_live');

    expect(userId).toBe('tiktok:hana_live');
    expect(parseUserId(userId)).toMatchObject({
      platform: 'tiktok',
      userName: 'hana_live',
      isOwner: false,
    });
  });

  it('hydrates TikTok profile identity from context metadata', () => {
    const manager = new UserManager(testConfig);
    const context: PointContext = {
      userId: 'anonymous',
      platform: 'tiktok',
      message: 'こんばんは',
      isOwner: false,
      timestamp: Date.now(),
      metadata: {
        handle: '@hana_live',
        nickname: 'Hana',
        realName: 'Hana Yamada',
      },
    };

    const user = manager.getOrCreateUser(context);

    expect(user.type).toBe('tiktok');
    expect(user.id).toBe('tiktok:hana_live');
    expect(user.handle).toBe('@hana_live');
    expect(user.nickname).toBe('Hana');
    expect(user.realName).toBe('Hana Yamada');
    expect(user.displayName).toBe('Hana Yamada');
  });
});
