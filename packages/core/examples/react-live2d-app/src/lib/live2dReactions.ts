export const LIVE2D_REACTION_EMOTIONS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
  'neutral',
] as const;

export type Live2DReactionEmotion = (typeof LIVE2D_REACTION_EMOTIONS)[number];
export type Live2DReactionControlMode = 'none' | 'manual' | 'linked';
export type Live2DEmotionEffectMap = Record<
  Live2DReactionEmotion,
  string | null
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
  expression: string;
}

export type Live2DReaction = Live2DReactionDraft & { id: number };

const EXPRESSION_CANDIDATES: Record<Live2DReactionEmotion, readonly string[]> =
  {
    happy: ['happy', 'smile', 'joy', 'warai'],
    surprised: ['surprised', 'surprise', 'shock', 'odoroki'],
    sad: ['sad', 'sorrow', 'cry', 'kanashii'],
    angry: ['angry', 'anger', 'mad', 'ikari'],
    relaxed: ['relaxed', 'relax', 'calm', 'smile'],
    thinking: ['thinking', 'think', 'question', 'confused'],
    neutral: [],
  };

export function createLinkedLive2DReaction(
  controlMode: Live2DReactionControlMode,
  screenplay: unknown,
  effectMap: Live2DEmotionEffectMap,
  availableExpressionNames: readonly string[],
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
  const configuredExpression = effectMap[normalized];
  if (!configuredExpression) return null;
  const expression = resolveLive2DExpressionName(
    configuredExpression,
    normalized,
    availableExpressionNames,
  );
  return expression ? { expression } : null;
}

export function resolveLive2DExpressionName(
  configuredExpression: string,
  emotion: Live2DReactionEmotion,
  availableExpressionNames: readonly string[],
): string | null {
  const normalizedNames = new Map(
    availableExpressionNames.map((name) => [name.toLowerCase(), name]),
  );
  const exact = normalizedNames.get(configuredExpression.toLowerCase());
  if (exact) return exact;

  for (const candidate of EXPRESSION_CANDIDATES[emotion]) {
    const match = normalizedNames.get(candidate);
    if (match) return match;
  }
  return null;
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
        candidate === null ||
        (typeof candidate === 'string' && candidate.trim())
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

function isLive2DReactionEmotion(
  value: unknown,
): value is Live2DReactionEmotion {
  return LIVE2D_REACTION_EMOTIONS.some((emotion) => emotion === value);
}
