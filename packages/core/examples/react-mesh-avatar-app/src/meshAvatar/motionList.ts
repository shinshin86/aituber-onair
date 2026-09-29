import type { MeshAvatarMotionInfo } from './createMeshAvatar.js';
import { IDLE_MOTIONS, MOTIONS } from './motions.js';

/** Motions the avatar can play, for building UI before the avatar has loaded. */
export const MOTION_LIST: MeshAvatarMotionInfo[] = [
  ...Object.entries(MOTIONS as Record<string, { label: string }>).map(
    ([id, motion]) => ({ id, label: motion.label, idle: false }),
  ),
  ...Object.entries(IDLE_MOTIONS as Record<string, { label: string }>).map(
    ([id, motion]) => ({ id, label: motion.label, idle: true }),
  ),
];
