import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PSD_EMOTION_EFFECT_ANCHOR,
  DEFAULT_PSD_EMOTION_EFFECT_MAP,
  createPsdEmotionReactionFromScreenplay,
  getPsdEmotionEffectAnchor,
  isPsdEmotionEffectControlMode,
  normalizePsdEmotionEffectAnchor,
  normalizePsdEmotionEffectMap,
  withPsdEmotionReactionId,
} from '../src/lib/psdEmotionEffects';

describe('PSD emotion effect settings', () => {
  it('accepts only supported control modes', () => {
    expect(isPsdEmotionEffectControlMode('none')).toBe(true);
    expect(isPsdEmotionEffectControlMode('manual')).toBe(true);
    expect(isPsdEmotionEffectControlMode('linked')).toBe(true);
    expect(isPsdEmotionEffectControlMode('automatic')).toBe(false);
  });

  it('normalizes mappings while preserving explicit none assignments', () => {
    expect(
      normalizePsdEmotionEffectMap({
        happy: 'thinking',
        sad: null,
        angry: 'invalid',
      }),
    ).toEqual({
      ...DEFAULT_PSD_EMOTION_EFFECT_MAP,
      happy: 'thinking',
      sad: null,
    });
  });

  it('clamps anchor positions and scale to supported ranges', () => {
    expect(
      normalizePsdEmotionEffectAnchor({
        faceX: -1,
        faceY: 2,
        leftEyeX: Number.NaN,
        effectScale: 9,
      }),
    ).toEqual({
      ...DEFAULT_PSD_EMOTION_EFFECT_ANCHOR,
      faceX: 0,
      faceY: 1,
      effectScale: 1.5,
    });
  });

  it('loads a stored anchor for the current PSD profile', () => {
    const stored = {
      ...DEFAULT_PSD_EMOTION_EFFECT_ANCHOR,
      faceX: 0.4,
    };
    expect(getPsdEmotionEffectAnchor({ profile: stored }, 'profile')).toEqual(
      stored,
    );
    expect(getPsdEmotionEffectAnchor({ profile: stored }, 'other')).toEqual(
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR,
    );
  });
});

describe('PSD emotion reactions', () => {
  it('maps a screenplay emotion to its configured effect', () => {
    expect(
      createPsdEmotionReactionFromScreenplay({ emotion: ' HAPPY ' }),
    ).toEqual({ effect: 'happy' });
    expect(
      createPsdEmotionReactionFromScreenplay(
        { emotion: 'happy' },
        { ...DEFAULT_PSD_EMOTION_EFFECT_MAP, happy: 'surprised' },
      ),
    ).toEqual({ effect: 'surprised' });
  });

  it('ignores neutral, missing, and unsupported emotions', () => {
    expect(
      createPsdEmotionReactionFromScreenplay({ emotion: 'neutral' }),
    ).toBeNull();
    expect(
      createPsdEmotionReactionFromScreenplay({ text: 'hello' }),
    ).toBeNull();
    expect(
      createPsdEmotionReactionFromScreenplay({ emotion: 'confused' }),
    ).toBeNull();
  });

  it('assigns a playback id without changing the draft', () => {
    const draft = { effect: 'sad', durationMs: 2400 } as const;
    expect(withPsdEmotionReactionId(draft, 3)).toEqual({ ...draft, id: 3 });
    expect(draft).toEqual({ effect: 'sad', durationMs: 2400 });
  });
});
