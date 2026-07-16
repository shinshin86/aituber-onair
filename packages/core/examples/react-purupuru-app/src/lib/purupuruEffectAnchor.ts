import type { PuruPuruEffectAnchor } from '../types/settings';

const MIN_ANCHOR_RATIO = -0.5;
const MAX_ANCHOR_RATIO = 0.5;
export const MIN_EFFECT_SCALE = 0.5;
export const MAX_EFFECT_SCALE = 1.5;

export const DEFAULT_PURUPURU_EFFECT_ANCHOR: PuruPuruEffectAnchor = {
  faceX: 0,
  faceY: -0.24,
  leftEyeX: -0.095,
  leftEyeY: -0.125,
  rightEyeX: 0.105,
  rightEyeY: -0.14,
  effectScale: 1,
};

export function normalizePuruPuruEffectAnchor(
  value: Partial<PuruPuruEffectAnchor> | undefined,
): PuruPuruEffectAnchor {
  return {
    faceX: normalizeRatio(value?.faceX, DEFAULT_PURUPURU_EFFECT_ANCHOR.faceX),
    faceY: normalizeRatio(value?.faceY, DEFAULT_PURUPURU_EFFECT_ANCHOR.faceY),
    leftEyeX: normalizeRatio(
      value?.leftEyeX,
      DEFAULT_PURUPURU_EFFECT_ANCHOR.leftEyeX,
    ),
    leftEyeY: normalizeRatio(
      value?.leftEyeY,
      DEFAULT_PURUPURU_EFFECT_ANCHOR.leftEyeY,
    ),
    rightEyeX: normalizeRatio(
      value?.rightEyeX,
      DEFAULT_PURUPURU_EFFECT_ANCHOR.rightEyeX,
    ),
    rightEyeY: normalizeRatio(
      value?.rightEyeY,
      DEFAULT_PURUPURU_EFFECT_ANCHOR.rightEyeY,
    ),
    effectScale: clampFinite(
      value?.effectScale,
      MIN_EFFECT_SCALE,
      MAX_EFFECT_SCALE,
      DEFAULT_PURUPURU_EFFECT_ANCHOR.effectScale,
    ),
  };
}

export function getPuruPuruEffectAnchor(
  anchors: Record<string, PuruPuruEffectAnchor>,
  profileId: string | undefined,
): PuruPuruEffectAnchor {
  return normalizePuruPuruEffectAnchor(
    profileId ? anchors[profileId] : undefined,
  );
}

function normalizeRatio(value: number | undefined, fallback: number): number {
  return clampFinite(value, MIN_ANCHOR_RATIO, MAX_ANCHOR_RATIO, fallback);
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
