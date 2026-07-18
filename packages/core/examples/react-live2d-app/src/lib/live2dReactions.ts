export const LIVE2D_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type Live2DEmotionEffect = (typeof LIVE2D_EMOTION_EFFECTS)[number];

export const LIVE2D_REACTION_EMOTIONS = [
  ...LIVE2D_EMOTION_EFFECTS,
  'neutral',
] as const;

export type Live2DReactionEmotion = (typeof LIVE2D_REACTION_EMOTIONS)[number];
export type Live2DReactionControlMode = 'none' | 'manual' | 'linked';
export type Live2DEmotionEffectMap = Record<
  Live2DReactionEmotion,
  Live2DEmotionEffect | null
>;

export const DEFAULT_LIVE2D_EMOTION_EFFECT_MAP: Live2DEmotionEffectMap = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  thinking: 'thinking',
  neutral: null,
};

export interface Live2DReactionDraft {
  effect: Live2DEmotionEffect;
  durationMs?: number;
}

export type Live2DReaction = Live2DReactionDraft & { id: number };

export function createLinkedLive2DReaction(
  controlMode: Live2DReactionControlMode,
  screenplay: unknown,
  effectMap: Live2DEmotionEffectMap,
): Live2DReactionDraft | null {
  if (
    controlMode !== 'linked' ||
    !screenplay ||
    typeof screenplay !== 'object'
  ) {
    return null;
  }

  const emotion = (screenplay as { emotion?: unknown }).emotion;
  if (typeof emotion !== 'string') return null;
  const normalized = emotion.toLowerCase().trim();
  if (!isLive2DReactionEmotion(normalized)) return null;
  const effect = effectMap[normalized];
  return effect ? { effect } : null;
}

export function normalizeLive2DEmotionEffectMap(
  value: unknown,
): Live2DEmotionEffectMap {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<Live2DEmotionEffectMap>)
      : {};

  return Object.fromEntries(
    LIVE2D_REACTION_EMOTIONS.map((emotion) => {
      const candidate = source[emotion];
      const effect =
        candidate === null || isLive2DEmotionEffect(candidate)
          ? candidate
          : DEFAULT_LIVE2D_EMOTION_EFFECT_MAP[emotion];
      return [emotion, effect];
    }),
  ) as Live2DEmotionEffectMap;
}

export function isLive2DReactionControlMode(
  value: unknown,
): value is Live2DReactionControlMode {
  return value === 'none' || value === 'manual' || value === 'linked';
}

export function withLive2DReactionId(
  draft: Live2DReactionDraft,
  id: number,
): Live2DReaction {
  return { ...draft, id };
}

function isLive2DEmotionEffect(value: unknown): value is Live2DEmotionEffect {
  return LIVE2D_EMOTION_EFFECTS.some((effect) => effect === value);
}

function isLive2DReactionEmotion(
  value: unknown,
): value is Live2DReactionEmotion {
  return LIVE2D_REACTION_EMOTIONS.some((emotion) => emotion === value);
}
