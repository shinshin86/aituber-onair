export const INOCHI2D_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type Inochi2DEmotionEffect = (typeof INOCHI2D_EMOTION_EFFECTS)[number];

export const INOCHI2D_REACTION_EMOTIONS = [
  ...INOCHI2D_EMOTION_EFFECTS,
  'neutral',
] as const;

export type Inochi2DReactionEmotion =
  (typeof INOCHI2D_REACTION_EMOTIONS)[number];
export type Inochi2DReactionControlMode = 'none' | 'manual' | 'linked';
export type Inochi2DEmotionEffectMap = Record<
  Inochi2DReactionEmotion,
  Inochi2DEmotionEffect | null
>;

export const DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP: Inochi2DEmotionEffectMap = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  thinking: 'thinking',
  neutral: null,
};

export interface Inochi2DReactionDraft {
  effect: Inochi2DEmotionEffect;
}

export type Inochi2DReaction = Inochi2DReactionDraft & { id: number };

export function createLinkedInochi2DReaction(
  controlMode: Inochi2DReactionControlMode,
  screenplay: unknown,
  effectMap: Inochi2DEmotionEffectMap,
): Inochi2DReactionDraft | null {
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
  if (!isInochi2DReactionEmotion(normalized)) return null;
  const effect = effectMap[normalized];
  return effect ? { effect } : null;
}

export function normalizeInochi2DEmotionEffectMap(
  value: unknown,
): Inochi2DEmotionEffectMap {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<Inochi2DEmotionEffectMap>)
      : {};

  return Object.fromEntries(
    INOCHI2D_REACTION_EMOTIONS.map((emotion) => {
      const candidate = source[emotion];
      const effect =
        candidate === null || isInochi2DEmotionEffect(candidate)
          ? candidate
          : DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP[emotion];
      return [emotion, effect];
    }),
  ) as Inochi2DEmotionEffectMap;
}

export function isInochi2DReactionControlMode(
  value: unknown,
): value is Inochi2DReactionControlMode {
  return value === 'none' || value === 'manual' || value === 'linked';
}

export function withInochi2DReactionId(
  draft: Inochi2DReactionDraft,
  id: number,
): Inochi2DReaction {
  return { ...draft, id };
}

function isInochi2DEmotionEffect(
  value: unknown,
): value is Inochi2DEmotionEffect {
  return INOCHI2D_EMOTION_EFFECTS.some((effect) => effect === value);
}

function isInochi2DReactionEmotion(
  value: unknown,
): value is Inochi2DReactionEmotion {
  return INOCHI2D_REACTION_EMOTIONS.some((emotion) => emotion === value);
}
