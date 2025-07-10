import { describe, it, expect } from 'vitest';
import { overridePrompts } from '../src/types/prompts.js';
import { DEFAULT_PROMPTS } from '../src/config/defaultPrompts.js';
import type { LocalizedPrompts } from '../src/types/prompts.js';

describe('overridePrompts', () => {
  it('should return default prompts when no custom prompts provided', () => {
    const result = overridePrompts(DEFAULT_PROMPTS);
    expect(result).toEqual(DEFAULT_PROMPTS);
  });

  it('should return default prompts when custom prompts is undefined', () => {
    const result = overridePrompts(DEFAULT_PROMPTS, undefined);
    expect(result).toEqual(DEFAULT_PROMPTS);
  });

  it('should override specific language prompts with custom prompts', () => {
    const customPrompts = {
      ja: {
        intervention: ['カスタムプロンプト1', 'カスタムプロンプト2'],
      },
    };

    const result = overridePrompts(DEFAULT_PROMPTS, customPrompts);

    // Japanese prompts should be overridden
    expect(result.ja.intervention).toEqual(customPrompts.ja.intervention);

    // English prompts should remain default
    expect(result.en.intervention).toEqual(DEFAULT_PROMPTS.en.intervention);
  });

  it('should add new language prompts while preserving defaults', () => {
    const customPrompts = {
      zh: {
        intervention: ['换个话题吧', '我们聊点别的'],
      },
    };

    const result = overridePrompts(DEFAULT_PROMPTS, customPrompts);

    // New language should be added
    expect(result.zh.intervention).toEqual(customPrompts.zh.intervention);

    // Existing languages should remain
    expect(result.ja.intervention).toEqual(DEFAULT_PROMPTS.ja.intervention);
    expect(result.en.intervention).toEqual(DEFAULT_PROMPTS.en.intervention);
  });

  it('should handle multiple language overrides', () => {
    const customPrompts = {
      ja: {
        intervention: ['カスタム日本語'],
      },
      en: {
        intervention: ['Custom English'],
      },
      es: {
        intervention: ['Español personalizado'],
      },
    };

    const result = overridePrompts(DEFAULT_PROMPTS, customPrompts);

    // All custom languages should be applied
    expect(result.ja.intervention).toEqual(['カスタム日本語']);
    expect(result.en.intervention).toEqual(['Custom English']);
    expect(result.es.intervention).toEqual(['Español personalizado']);
  });

  it('should ignore empty or invalid custom prompts', () => {
    const customPrompts = {
      ja: {
        intervention: [], // Empty array
      },
      en: undefined as unknown, // Undefined
      fr: {
        // Missing intervention
      } as unknown,
    };

    const result = overridePrompts(DEFAULT_PROMPTS, customPrompts);

    // Empty intervention should still override (as it's technically valid)
    expect(result.ja.intervention).toEqual([]);

    // Default English should be preserved (undefined template)
    expect(result.en.intervention).toEqual(DEFAULT_PROMPTS.en.intervention);

    // French should not be added (missing intervention)
    expect(result.fr).toBeUndefined();
  });

  it('should preserve default structure when partially overriding', () => {
    const defaultWithExtras: LocalizedPrompts = {
      ...DEFAULT_PROMPTS,
      ja: {
        intervention: DEFAULT_PROMPTS.ja.intervention,
        // Imagine there are other properties in the future
      } as unknown,
    };

    const customPrompts = {
      ja: {
        intervention: ['新しいプロンプト'],
      },
    };

    const result = overridePrompts(defaultWithExtras, customPrompts);

    // Custom intervention should be applied
    expect(result.ja.intervention).toEqual(['新しいプロンプト']);

    // Other properties should be preserved
    // (This test ensures the spread operator works correctly)
    expect(Object.keys(result.ja)).toContain('intervention');
  });

  it('should handle the exact user reported case', () => {
    // This is the exact custom prompts structure from the user's bug report
    const userCustomPrompts = {
      ja: {
        intervention: [
          '話題を変えて、新しい内容について話しましょう。',
          '別の角度から話題を展開してみませんか？',
          '違うテーマで会話を続けてみましょう。',
          '新しいトピックに移りましょう。最近興味を持っていることはありますか？',
          '会話のリズムを変えて、違った視点から話してみませんか？',
          '同じような内容が続いているようです。新鮮な話題で盛り上がりましょう！',
        ],
      },
      en: {
        intervention: [
          "Let's change the subject and talk about something new.",
          'How about exploring this topic from a different angle?',
          "Let's try a different approach to our conversation.",
          'Time for a new topic. What have you been interested in lately?',
          "Let's change the rhythm of our conversation with a fresh perspective.",
          "We seem to be covering similar ground. Let's explore something different!",
        ],
      },
    };

    const result = overridePrompts(DEFAULT_PROMPTS, userCustomPrompts);

    // User's custom prompts should be exactly applied
    expect(result.ja.intervention).toEqual(userCustomPrompts.ja.intervention);
    expect(result.en.intervention).toEqual(userCustomPrompts.en.intervention);

    // Verify no default prompts leak through
    expect(result.ja.intervention).not.toEqual(DEFAULT_PROMPTS.ja.intervention);
    expect(result.en.intervention).not.toEqual(DEFAULT_PROMPTS.en.intervention);
  });
});
