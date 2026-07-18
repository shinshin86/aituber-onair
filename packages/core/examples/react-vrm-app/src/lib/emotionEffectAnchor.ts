export interface EmotionEffectAnchor {
  faceX: number;
  faceY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  effectScale: number;
}

export const DEFAULT_EMOTION_EFFECT_ANCHOR: EmotionEffectAnchor = {
  faceX: 0.5,
  faceY: 0.12,
  leftEyeX: 0.47,
  leftEyeY: 0.11,
  rightEyeX: 0.53,
  rightEyeY: 0.11,
  effectScale: 1,
};

export const MIN_EMOTION_EFFECT_SCALE = 0.5;
export const MAX_EMOTION_EFFECT_SCALE = 1.5;

export function normalizeEmotionEffectAnchor(
  value: Partial<EmotionEffectAnchor> | undefined,
): EmotionEffectAnchor {
  return {
    faceX: normalizeRatio(value?.faceX, DEFAULT_EMOTION_EFFECT_ANCHOR.faceX),
    faceY: normalizeRatio(value?.faceY, DEFAULT_EMOTION_EFFECT_ANCHOR.faceY),
    leftEyeX: normalizeRatio(
      value?.leftEyeX,
      DEFAULT_EMOTION_EFFECT_ANCHOR.leftEyeX,
    ),
    leftEyeY: normalizeRatio(
      value?.leftEyeY,
      DEFAULT_EMOTION_EFFECT_ANCHOR.leftEyeY,
    ),
    rightEyeX: normalizeRatio(
      value?.rightEyeX,
      DEFAULT_EMOTION_EFFECT_ANCHOR.rightEyeX,
    ),
    rightEyeY: normalizeRatio(
      value?.rightEyeY,
      DEFAULT_EMOTION_EFFECT_ANCHOR.rightEyeY,
    ),
    effectScale: clampFinite(
      value?.effectScale,
      MIN_EMOTION_EFFECT_SCALE,
      MAX_EMOTION_EFFECT_SCALE,
      DEFAULT_EMOTION_EFFECT_ANCHOR.effectScale,
    ),
  };
}

export function getEmotionEffectAnchor(
  anchors: Record<string, EmotionEffectAnchor>,
  profileId: string | undefined,
): EmotionEffectAnchor {
  return normalizeEmotionEffectAnchor(
    profileId ? anchors[profileId] : undefined,
  );
}

export function normalizeEmotionEffectAnchors(
  value: unknown,
): Record<string, EmotionEffectAnchor> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([profileId]) => profileId.trim().length > 0)
      .slice(0, 24)
      .map(([profileId, anchor]) => [
        profileId,
        normalizeEmotionEffectAnchor(
          anchor && typeof anchor === 'object' && !Array.isArray(anchor)
            ? (anchor as Partial<EmotionEffectAnchor>)
            : undefined,
        ),
      ]),
  );
}

function normalizeRatio(value: number | undefined, fallback: number): number {
  return clampFinite(value, 0, 1, fallback);
}

function clampFinite(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const finite = typeof value === 'number' && Number.isFinite(value);
  return Math.min(Math.max(finite ? value : fallback, min), max);
}
