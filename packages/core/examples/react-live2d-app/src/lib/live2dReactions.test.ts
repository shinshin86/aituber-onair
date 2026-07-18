import { describe, expect, it } from 'vitest';
import {
  createLinkedLive2DReaction,
  DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
} from './live2dReactions';

describe('createLinkedLive2DReaction', () => {
  it('creates a visual effect immediately in linked mode', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
      ),
    ).toEqual({ effect: 'happy' });
  });

  it('uses a customized visual effect mapping', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_LIVE2D_EMOTION_EFFECT_MAP, happy: 'surprised' },
      ),
    ).toEqual({ effect: 'surprised' });
  });

  it('returns null when the mapping is none', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_LIVE2D_EMOTION_EFFECT_MAP, happy: null },
      ),
    ).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (mode) => {
      expect(
        createLinkedLive2DReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );
});
