import type {
  VrmExpressionPart,
  VrmOneShotAnimationName,
} from './vrmExpressionController';

export interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

export const VRM_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type VrmEmotionEffect = (typeof VRM_EMOTION_EFFECTS)[number];

export const VRM_REACTION_EMOTIONS = [
  ...VRM_EMOTION_EFFECTS,
  'neutral',
] as const;

export type VrmReactionEmotion = (typeof VRM_REACTION_EMOTIONS)[number];
export type VrmReactionControlMode = 'none' | 'manual' | 'linked';
export type VrmEmotionEffectMap = Record<
  VrmReactionEmotion,
  VrmEmotionEffect | null
>;

export const DEFAULT_VRM_EMOTION_EFFECT_MAP: VrmEmotionEffectMap = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  thinking: 'thinking',
  neutral: null,
};

export type VrmAvatarReactionDraft =
  | {
      type: 'emote';
      name: string;
      intensity?: number;
      fadeMs?: number;
      holdMs?: number;
    }
  | {
      type: 'gesture';
      parts: readonly VrmExpressionPart[];
      fadeMs?: number;
      holdMs?: number;
    }
  | {
      type: 'animation';
      name: VrmOneShotAnimationName;
    }
  | {
      type: 'reset';
      fadeMs?: number;
    };

export type VrmAvatarReaction = VrmAvatarReactionDraft & { id: number };

const REACTION_KEYWORDS = {
  laugh: /笑|ｗ|w{2,}|あは|えへ|ふふ|哈哈|lol/i,
  pout: /ぷん|むっ|怒|腹立|ひどい|もうっ/,
  teary: /泣|涙|うるうる|悲し|寂し|さみし|つらい|ごめん/,
  surprised: /[!?！？]|驚|びっくり|まさか|えっ|本当/,
  happy: /嬉し|うれし|楽しい|楽しか|ありがとう|助かる|いいね|最高/,
  relaxed: /なるほど|了解|わかった|大丈夫|安心|ほっと/,
} as const;

export function createVrmReactionFromScreenplay(
  screenplay: ScreenplayLike,
  effectMap: VrmEmotionEffectMap = DEFAULT_VRM_EMOTION_EFFECT_MAP,
): VrmAvatarReactionDraft | null {
  const emotion = screenplay.emotion?.toLowerCase().trim();
  const text = screenplay.text ?? '';

  if (!isVrmReactionEmotion(emotion)) return null;
  const effect = effectMap[emotion];
  return effect ? createVrmReactionFromEffect(effect, text) : null;
}

export function createLinkedVrmReaction(
  controlMode: VrmReactionControlMode,
  screenplay: ScreenplayLike,
  effectMap: VrmEmotionEffectMap,
): VrmAvatarReactionDraft | null {
  return controlMode === 'linked'
    ? createVrmReactionFromScreenplay(screenplay, effectMap)
    : null;
}

export function createVrmReactionFromEffect(
  effect: VrmEmotionEffect,
  text = '',
): VrmAvatarReactionDraft {
  if (effect === 'happy') {
    return REACTION_KEYWORDS.laugh.test(text)
      ? { type: 'animation', name: 'laugh' }
      : { type: 'emote', name: 'happy', intensity: 0.8, holdMs: 3500 };
  }

  if (effect === 'angry') {
    return REACTION_KEYWORDS.pout.test(text)
      ? { type: 'animation', name: 'pout' }
      : { type: 'emote', name: 'angry', intensity: 0.75, holdMs: 2500 };
  }

  if (effect === 'sad') {
    return REACTION_KEYWORDS.teary.test(text)
      ? { type: 'animation', name: 'teary' }
      : { type: 'emote', name: 'sad', intensity: 0.7, holdMs: 3000 };
  }

  if (effect === 'surprised') {
    return {
      type: 'gesture',
      parts: [
        { name: 'surprised', intensity: 0.7 },
        { name: 'eyeWideLeft', intensity: 0.55 },
        { name: 'eyeWideRight', intensity: 0.55 },
        { name: 'browInnerUp', intensity: 0.45 },
      ],
      holdMs: 1600,
    };
  }

  if (effect === 'relaxed') {
    return { type: 'emote', name: 'relaxed', intensity: 0.45, holdMs: 3000 };
  }

  return {
    type: 'gesture',
    parts: [
      { name: 'relaxed', intensity: 0.28 },
      { name: 'browInnerUp', intensity: 0.42 },
      { name: 'eyeSquintLeft', intensity: 0.18 },
      { name: 'eyeSquintRight', intensity: 0.18 },
    ],
    holdMs: 3000,
  };
}

export function normalizeVrmEmotionEffectMap(
  value: unknown,
): VrmEmotionEffectMap {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<VrmEmotionEffectMap>)
      : {};

  return Object.fromEntries(
    VRM_REACTION_EMOTIONS.map((emotion) => {
      const candidate = source[emotion];
      const effect =
        candidate === null || isVrmEmotionEffect(candidate)
          ? candidate
          : DEFAULT_VRM_EMOTION_EFFECT_MAP[emotion];
      return [emotion, effect];
    }),
  ) as VrmEmotionEffectMap;
}

export function isVrmReactionControlMode(
  value: unknown,
): value is VrmReactionControlMode {
  return value === 'none' || value === 'manual' || value === 'linked';
}

export function isVrmEmotionEffect(value: unknown): value is VrmEmotionEffect {
  return VRM_EMOTION_EFFECTS.some((effect) => effect === value);
}

function isVrmReactionEmotion(value: unknown): value is VrmReactionEmotion {
  return VRM_REACTION_EMOTIONS.some((emotion) => emotion === value);
}

export function sustainVrmReactionForSpeech(
  draft: VrmAvatarReactionDraft,
): VrmAvatarReactionDraft {
  if (draft.type === 'emote') {
    if (draft.name === 'happy') {
      return createSmileGesture();
    }

    return { ...draft, holdMs: undefined };
  }

  if (draft.type === 'gesture') {
    return { ...draft, holdMs: undefined };
  }

  if (draft.type === 'animation') {
    if (draft.name === 'laugh') {
      return createSmileGesture();
    }

    if (draft.name === 'pout') {
      return {
        type: 'gesture',
        parts: [
          { name: 'angry', intensity: 0.75 },
          { name: 'browDownLeft', intensity: 0.45 },
          { name: 'browDownRight', intensity: 0.45 },
          { name: 'mouthPucker', intensity: 0.35 },
        ],
      };
    }

    return {
      type: 'gesture',
      parts: [
        { name: 'sad', intensity: 0.7 },
        { name: 'browInnerUp', intensity: 0.6 },
        { name: 'mouthFrownLeft', intensity: 0.35 },
        { name: 'mouthFrownRight', intensity: 0.35 },
      ],
    };
  }

  return draft;
}

export function withReactionId(
  draft: VrmAvatarReactionDraft,
  id: number,
): VrmAvatarReaction {
  return { ...draft, id } as VrmAvatarReaction;
}

function createSmileGesture(): VrmAvatarReactionDraft {
  return {
    type: 'gesture',
    parts: [
      { name: 'happy', intensity: 0.78 },
      { name: 'mouthSmileLeft', intensity: 0.38 },
      { name: 'mouthSmileRight', intensity: 0.38 },
    ],
  };
}
