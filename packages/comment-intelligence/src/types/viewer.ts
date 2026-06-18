import type { SafetyCategory } from './safety.js';

export type ViewerProfile = {
  id: string;
  name?: string;
  firstSeenAt?: number;
  lastSeenAt?: number;
  messageCount?: number;
  relationshipLevel?: number;
  tags?: string[];
};

export type ViewerSafetyState = {
  viewerId: string;
  violationCount: number;
  lastViolationAt: number;
  blockedUntil?: number;
  categories: SafetyCategory[];
};
