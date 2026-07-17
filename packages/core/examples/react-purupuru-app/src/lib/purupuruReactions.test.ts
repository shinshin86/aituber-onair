import { describe, expect, it } from 'vitest';
import {
  createLinkedPuruPuruReaction,
  DEFAULT_PURUPURU_EMOTION_EFFECT_MAP,
} from './purupuruReactions';

describe('createLinkedPuruPuruReaction', () => {
  it('creates the mapped reaction immediately in linked mode', () => {
    const reaction = createLinkedPuruPuruReaction(
      'linked',
      { emotion: 'happy', text: 'うれしい！' },
      DEFAULT_PURUPURU_EMOTION_EFFECT_MAP,
    );

    expect(reaction?.effect).toBe('happy');
  });

  it('uses a customized emotion effect mapping', () => {
    const reaction = createLinkedPuruPuruReaction(
      'linked',
      { emotion: 'happy' },
      { ...DEFAULT_PURUPURU_EMOTION_EFFECT_MAP, happy: 'surprised' },
    );

    expect(reaction?.effect).toBe('surprised');
  });

  it('returns null when the emotion mapping is none', () => {
    const reaction = createLinkedPuruPuruReaction(
      'linked',
      { emotion: 'happy' },
      { ...DEFAULT_PURUPURU_EMOTION_EFFECT_MAP, happy: null },
    );

    expect(reaction).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (controlMode) => {
      const reaction = createLinkedPuruPuruReaction(
        controlMode,
        { emotion: 'happy' },
        DEFAULT_PURUPURU_EMOTION_EFFECT_MAP,
      );

      expect(reaction).toBeNull();
    },
  );
});
