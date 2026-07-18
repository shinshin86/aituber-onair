import { describe, expect, it } from 'vitest';
import {
  createLinkedVrmReaction,
  DEFAULT_VRM_EMOTION_EFFECT_MAP,
} from './vrmReactions';

describe('createLinkedVrmReaction', () => {
  it('creates a reaction immediately in linked mode', () => {
    const reaction = createLinkedVrmReaction(
      'linked',
      { emotion: 'happy', text: 'うれしい！' },
      DEFAULT_VRM_EMOTION_EFFECT_MAP,
    );

    expect(reaction).toMatchObject({ type: 'emote', name: 'happy' });
  });

  it('uses a customized emotion effect mapping', () => {
    const reaction = createLinkedVrmReaction(
      'linked',
      { emotion: 'happy' },
      { ...DEFAULT_VRM_EMOTION_EFFECT_MAP, happy: 'surprised' },
    );

    expect(reaction?.type).toBe('gesture');
  });

  it('returns null when the mapping is none', () => {
    const reaction = createLinkedVrmReaction(
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
        createLinkedVrmReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_VRM_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );
});
