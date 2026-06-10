import { describe, expect, it } from 'vitest';
import { splitSentence, textsToScreenplay } from '../src/services/messages';

describe('messages service utilities', () => {
  describe('splitSentence', () => {
    it('should split text by Japanese punctuation and newlines', () => {
      expect(splitSentence('こんにちは。元気ですか？はい！\n次です')).toEqual([
        'こんにちは。',
        '元気ですか？',
        'はい！',
        '\n',
        '次です',
      ]);
    });

    it('should preserve consecutive punctuation in split boundaries', () => {
      expect(splitSentence('え！？本当ですか。')).toEqual([
        'え！',
        '？',
        '本当ですか。',
      ]);
    });

    it('should return the original text when no separator exists', () => {
      expect(splitSentence('hello world')).toEqual(['hello world']);
    });
  });

  describe('textsToScreenplay', () => {
    it('should convert emotion tags to voice screenplay entries', () => {
      expect(textsToScreenplay(['[happy] Hello', '[sad] Bye'])).toEqual([
        {
          expression: 'happy',
          talk: {
            style: 'happy',
            message: 'Hello',
          },
        },
        {
          expression: 'sad',
          talk: {
            style: 'sad',
            message: 'Bye',
          },
        },
      ]);
    });

    it('should inherit the previous valid emotion for untagged text', () => {
      expect(textsToScreenplay(['[angry] Stop', 'Again'])).toEqual([
        {
          expression: 'angry',
          talk: {
            style: 'angry',
            message: 'Stop',
          },
        },
        {
          expression: 'angry',
          talk: {
            style: 'angry',
            message: 'Again',
          },
        },
      ]);
    });

    it('should keep the previous emotion when a tag is invalid', () => {
      expect(textsToScreenplay(['[happy] Yes', '[excited] Maybe'])).toEqual([
        {
          expression: 'happy',
          talk: {
            style: 'happy',
            message: 'Yes',
          },
        },
        {
          expression: 'happy',
          talk: {
            style: 'happy',
            message: 'Maybe',
          },
        },
      ]);
    });

    it('should map non-talk emotion expressions to talk style fallback', () => {
      expect(textsToScreenplay(['[relaxed] Calm'])).toEqual([
        {
          expression: 'relaxed',
          talk: {
            style: 'talk',
            message: 'Calm',
          },
        },
      ]);
    });
  });
});
