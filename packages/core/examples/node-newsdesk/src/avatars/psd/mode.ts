import type { PsdAvatarMode } from '../types.js';
type ResolvedAvatarMode = 'static' | 'motion';

export interface MotionModeDetection {
  usable: boolean;
  reason: string;
}

/** Resolve the requested mode from one Anime2.5DRig rigger diagnostic. */
export function selectAvatarMode(
  requested: PsdAvatarMode,
  detection: MotionModeDetection,
): ResolvedAvatarMode {
  if (requested === 'static') return 'static';
  if (detection.usable) return 'motion';
  if (requested === 'motion') throw new Error(detection.reason);
  return 'static';
}
