import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  getEmotionEffectAnchor,
  normalizeEmotionEffectAnchor,
  normalizeEmotionEffectAnchors,
} from './emotionEffectAnchor';

describe('emotion effect anchor', () => {
  it('normalizes anchor coordinates and effect scale', () => {
    expect(
      normalizeEmotionEffectAnchor({
        faceX: -1,
        faceY: 2,
        leftEyeX: Number.NaN,
        effectScale: 9,
      }),
    ).toEqual({
      ...DEFAULT_EMOTION_EFFECT_ANCHOR,
      faceX: 0,
      faceY: 1,
      effectScale: 1.5,
    });
  });

  it('keeps valid per-profile anchors and falls back for unknown profiles', () => {
    const custom = normalizeEmotionEffectAnchor({
      faceX: 0.4,
      faceY: 0.3,
      effectScale: 0.75,
    });
    const anchors = normalizeEmotionEffectAnchors({
      model: custom,
      invalid: 'nope',
    });

    expect(getEmotionEffectAnchor(anchors, 'model')).toEqual(custom);
    expect(getEmotionEffectAnchor(anchors, 'missing')).toEqual(
      DEFAULT_EMOTION_EFFECT_ANCHOR,
    );
    expect(anchors.invalid).toEqual(DEFAULT_EMOTION_EFFECT_ANCHOR);
  });
});
