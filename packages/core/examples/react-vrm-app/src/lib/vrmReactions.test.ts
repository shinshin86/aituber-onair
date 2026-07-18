import { describe, expect, it } from 'vitest';
import {
  createLinkedVrmEmotionEffectReaction,
  createVrmReactionFromScreenplay,
  DEFAULT_VRM_EMOTION_EFFECT_MAP,
} from './vrmReactions';

describe('createLinkedVrmEmotionEffectReaction', () => {
  it('creates a visual effect immediately in linked mode', () => {
    const reaction = createLinkedVrmEmotionEffectReaction(
      'linked',
      { emotion: 'happy', text: 'うれしい！' },
      DEFAULT_VRM_EMOTION_EFFECT_MAP,
    );

    expect(reaction).toEqual({ effect: 'happy' });
  });

  it('uses a customized emotion effect mapping', () => {
    const reaction = createLinkedVrmEmotionEffectReaction(
      'linked',
      { emotion: 'happy' },
      { ...DEFAULT_VRM_EMOTION_EFFECT_MAP, happy: 'surprised' },
    );

    expect(reaction).toEqual({ effect: 'surprised' });
  });

  it('returns null when the mapping is none', () => {
    const reaction = createLinkedVrmEmotionEffectReaction(
      'linked',
      { emotion: 'happy' },
      { ...DEFAULT_VRM_EMOTION_EFFECT_MAP, happy: null },
    );

    expect(reaction).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (mode) => {
      expect(
        createLinkedVrmEmotionEffectReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_VRM_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );

  it('keeps the native VRM reaction separate from the visual effect', () => {
    expect(createVrmReactionFromScreenplay({ emotion: 'happy' })).toMatchObject(
      { type: 'emote', name: 'happy' },
    );
  });
});
