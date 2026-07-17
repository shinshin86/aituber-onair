import { describe, expect, it } from 'vitest';
import {
  createLinkedLive2DReaction,
  DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
} from './live2dReactions';

const expressions = ['Smile', 'Surprise', 'Sad'];

describe('createLinkedLive2DReaction', () => {
  it('resolves a model expression immediately in linked mode', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
        expressions,
      ),
    ).toEqual({ expression: 'Smile' });
  });

  it('uses a customized model expression mapping', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_LIVE2D_EMOTION_EFFECT_MAP, happy: 'Surprise' },
        expressions,
      ),
    ).toEqual({ expression: 'Surprise' });
  });

  it('returns null when the mapping or model expression is unavailable', () => {
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_LIVE2D_EMOTION_EFFECT_MAP, happy: null },
        expressions,
      ),
    ).toBeNull();
    expect(
      createLinkedLive2DReaction(
        'linked',
        { emotion: 'angry' },
        DEFAULT_LIVE2D_EMOTION_EFFECT_MAP,
        expressions,
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
          expressions,
        ),
      ).toBeNull();
    },
  );
});
