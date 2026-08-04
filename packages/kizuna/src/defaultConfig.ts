import type { BondStage, KizunaConfig } from './types';

export const DEFAULT_BOND_STAGES: BondStage[] = [
  { id: 'stranger', minPoints: 0 },
  { id: 'acquaintance', minPoints: 100 },
  { id: 'regular', minPoints: 500 },
  { id: 'companion', minPoints: 1_000 },
];

export function createDefaultKizunaConfig(): KizunaConfig {
  return {
    enabled: true,
    owner: {
      initialPoints: 0,
      pointMultiplier: 1,
      exclusiveAchievements: [],
      firstContactBonus: 0,
    },
    basePoints: {
      message: 1,
      reaction: 1,
      gift: 10,
      presence: 1,
      touch: 1,
    },
    rules: [],
    thresholds: [],
    storage: {
      maxUsers: 1_000,
      dataRetentionDays: 90,
      cleanupIntervalHours: 24,
    },
    dev: {
      debugMode: false,
      logLevel: 'info',
      showDebugPanel: false,
    },
    warmth: {
      halfLifeMs: 7 * 24 * 60 * 60 * 1_000,
      floor: 0.2,
    },
    continuity: {
      unit: 'day',
      grace: 0,
    },
    stages: DEFAULT_BOND_STAGES.map((stage) => ({ ...stage })),
    context: {
      defaultLanguage: 'en',
    },
  };
}
