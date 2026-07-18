import { describe, expect, it } from 'vitest';
import {
  createLinkedPngTuberEmotionReaction,
  DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
} from './pngtuberEmotionEffects';

describe('createLinkedPngTuberEmotionReaction', () => {
  it('creates the mapped reaction immediately in linked mode', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
      ),
    ).toEqual({ effect: 'happy' });
  });

  it('uses a customized emotion effect mapping', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP, happy: 'surprised' },
      ),
    ).toEqual({ effect: 'surprised' });
  });

  it('returns null when the mapping is none', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP, happy: null },
      ),
    ).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (mode) => {
      expect(
        createLinkedPngTuberEmotionReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );
});
