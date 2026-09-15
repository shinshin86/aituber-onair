import type {
  InochiRuntimeController,
  ResolvedInochiModelDefinition,
} from '../types/inochi2d';

export const MOTION_EMOTIONS = [
  ['neutral', '通常'],
  ['happy', '喜び'],
  ['surprised', '驚き'],
  ['sad', '悲しみ'],
  ['angry', '怒り'],
  ['relaxed', '安らぎ'],
  ['thinking', '考え中'],
] as const;

// Undefined uses the manifest default; null explicitly disables a motion.
export type MotionProfile = {
  idle?: string | null;
  emotions: Record<string, string | null>;
};
export const emptyMotionProfile = (): MotionProfile => ({ emotions: {} });
const PREFIX = 'inochi2d:motion-profile:v1:';

export async function getMotionProfileKey(
  model: ResolvedInochiModelDefinition,
) {
  if (!model.modelUrl.startsWith('blob:')) {
    return `manifest:${model.id}:${model.modelUrl}:${model.motionUrl ?? ''}`;
  }
  const response = await fetch(model.modelUrl);
  if (!response.ok) throw new Error('モデルの識別情報を取得できませんでした。');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await response.arrayBuffer(),
  );
  return `file:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function readMotionProfile(key: string): MotionProfile {
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return emptyMotionProfile();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') return emptyMotionProfile();
  const source = value as Partial<MotionProfile>;
  const profile = emptyMotionProfile();
  if (source.idle === null || typeof source.idle === 'string')
    profile.idle = source.idle;
  for (const [emotion] of MOTION_EMOTIONS) {
    const motion = source.emotions?.[emotion];
    if (motion === null || typeof motion === 'string')
      profile.emotions[emotion] = motion;
  }
  return profile;
}

export function writeMotionProfile(key: string, profile: MotionProfile) {
  localStorage.setItem(PREFIX + key, JSON.stringify(profile));
}

export function resolveIdleMotions(
  model: ResolvedInochiModelDefinition,
  profile: MotionProfile,
  names: string[],
) {
  const requested =
    profile.idle === undefined
      ? model.idleAnimations?.length
        ? model.idleAnimations
        : model.autoAnimation
          ? [model.autoAnimation]
          : []
      : profile.idle === null
        ? []
        : [profile.idle];
  return requested.filter((name) => names.includes(name));
}

export async function applyIdleMotionProfile(
  controller: InochiRuntimeController,
  model: ResolvedInochiModelDefinition,
  profile: MotionProfile,
  names: string[],
  restart = false,
) {
  const idleAnimations = resolveIdleMotions(model, profile, names);
  await controller.configureAnimationGroups?.({
    idleAnimations,
    // A user-selected idle must repeat even if the manifest marks it as rare.
    idleAnimationProfiles:
      typeof profile.idle === 'string'
        ? { [profile.idle]: { type: 'base', cooldownMs: 0, weight: 1 } }
        : model.idleAnimationProfiles,
    reactionAnimations: model.reactionAnimations,
    emotionAnimations: model.emotionAnimations,
  });
  if (restart) await controller.stopAnimation?.();
  if (controller.playIdleAnimations) {
    await controller.playIdleAnimations(idleAnimations, { shuffle: true });
  } else if (idleAnimations[0]) {
    await controller.playAnimation?.(idleAnimations[0], {
      loop: true,
      restart: true,
    });
  }
}

export async function playProfileEmotion(
  controller: InochiRuntimeController,
  profile: MotionProfile,
  names: string[],
  emotion: string,
  defaults: Record<string, string[]> = {},
) {
  const normalized = emotion.trim().toLowerCase();
  if (!MOTION_EMOTIONS.some(([name]) => name === normalized)) return;
  const assigned = profile.emotions[normalized];
  const candidates =
    assigned === undefined
      ? (defaults[normalized] ?? defaults.neutral ?? [])
      : assigned === null
        ? []
        : [assigned];
  const available = candidates.filter((name) => names.includes(name));
  const name = available[Math.floor(Math.random() * available.length)];
  if (name) await playMotionClip(controller, name, false);
}

export async function playMotionClip(
  controller: InochiRuntimeController,
  name: string,
  loop: boolean,
) {
  // The prebuilt bridge chains reaction clips back to idle with a transition.
  // Its manual/emotion kinds stop at the end, leaving the idle queue paused.
  await controller.playAnimation?.(name, {
    kind: loop ? 'manual' : 'reaction',
    loop,
    restart: true,
    transitionMs: 250,
  });
}
