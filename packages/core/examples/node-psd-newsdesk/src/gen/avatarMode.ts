import type { AvatarMode, ResolvedAvatarMode } from '../types.js';

export interface MotionModeDetection {
  usable: boolean;
  reason: string;
}

/** Resolve the requested mode from one Anime2.5DRig rigger diagnostic. */
export function selectAvatarMode(
  requested: AvatarMode,
  detection: MotionModeDetection,
): ResolvedAvatarMode {
  if (requested === 'static') return 'static';
  if (detection.usable) return 'motion';
  if (requested === 'motion') throw new Error(detection.reason);
  return 'static';
}
