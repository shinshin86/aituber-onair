import { getInochiRuntimeSession } from './inochi2dRuntimeSession';

type Inochi2DEmotion =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'relaxed'
  | string;

const EMOTION_PRESET_CANDIDATES: Record<string, readonly string[]> = {
  neutral: ['neutral'],
  happy: ['happy', 'smile', 'neutral'],
  angry: ['angry', 'thinking', 'sad', 'neutral'],
  sad: ['sad', 'neutral'],
  surprised: ['surprised', 'neutral'],
  relaxed: ['relaxed', 'smile', 'neutral'],
  thinking: ['thinking', 'neutral'],
  listening: ['listening', 'relaxed', 'neutral'],
  speaking: ['speaking', 'happy', 'smile', 'neutral'],
  error: ['error', 'sad', 'neutral'],
};

const EMOTION_PRESET_WEIGHTS: Record<string, number> = {
  relaxed: 0.45,
};

const normalizeEmotion = (emotion?: Inochi2DEmotion | null) =>
  typeof emotion === 'string' && emotion.trim() ? emotion.trim() : 'neutral';

const resolvePresetName = (
  emotion: string,
  availablePresetNames: readonly string[],
) => {
  const available = new Set(availablePresetNames);
  const candidates = EMOTION_PRESET_CANDIDATES[emotion] ?? [emotion, 'neutral'];

  return candidates.find((candidate) => available.has(candidate)) ?? null;
};

export const applyInochi2DExpression = async (
  emotion?: Inochi2DEmotion | null,
  options: {
    weight?: number;
    allowMouth?: boolean;
  } = {},
) => {
  const runtimeSession = getInochiRuntimeSession();
  const controller = runtimeSession?.getController();
  if (!runtimeSession || !controller?.setExpressionPreset) {
    return {
      applied: false,
      emotion: normalizeEmotion(emotion),
      preset: null,
      reason: 'controller-unavailable',
    };
  }

  const normalizedEmotion = normalizeEmotion(emotion);
  const presetNames =
    typeof controller.getExpressionPresetNames === 'function'
      ? await Promise.resolve(controller.getExpressionPresetNames())
      : Object.keys(EMOTION_PRESET_CANDIDATES);
  const preset = resolvePresetName(normalizedEmotion, presetNames);
  if (!preset) {
    return {
      applied: false,
      emotion: normalizedEmotion,
      preset: null,
      reason: 'preset-unavailable',
    };
  }

  await Promise.resolve(
    controller.setExpressionPreset(preset, {
      weight: options.weight ?? EMOTION_PRESET_WEIGHTS[normalizedEmotion] ?? 1,
      allowMouth: options.allowMouth === true,
    }),
  );

  return {
    applied: true,
    emotion: normalizedEmotion,
    preset,
    reason: null,
  };
};
