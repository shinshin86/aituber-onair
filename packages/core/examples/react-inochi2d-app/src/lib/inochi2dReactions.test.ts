import { describe, expect, it } from 'vitest';
import {
  createLinkedInochi2DReaction,
  DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP,
} from './inochi2dReactions';

describe('createLinkedInochi2DReaction', () => {
  it('creates the mapped reaction immediately in linked mode', () => {
    expect(
      createLinkedInochi2DReaction(
        'linked',
        { emotion: 'happy' },
        DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP,
      ),
    ).toEqual({ effect: 'happy' });
  });

  it('uses a customized emotion effect mapping', () => {
    expect(
      createLinkedInochi2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP, happy: 'surprised' },
      ),
    ).toEqual({ effect: 'surprised' });
  });

  it('returns null when the mapping is none', () => {
    expect(
      createLinkedInochi2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP, happy: null },
      ),
    ).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (mode) => {
      expect(
        createLinkedInochi2DReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_INOCHI2D_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );
});
