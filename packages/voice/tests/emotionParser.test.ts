import { describe, expect, it } from 'vitest';
import { EmotionParser } from '../src/utils/emotionParser';

describe('EmotionParser', () => {
  it('should extract emotion tags case-insensitively and clean all tags', () => {
    expect(EmotionParser.extractEmotion('[HAPPY] Hello [sad]')).toEqual({
      emotion: 'happy',
      cleanText: 'Hello',
    });
  });

  it('should return only cleanText when no emotion tag exists', () => {
    expect(EmotionParser.extractEmotion('Hello')).toEqual({
      cleanText: 'Hello',
    });
  });

  it('should validate supported emotions', () => {
    expect(EmotionParser.isValidEmotion('happy')).toBe(true);
    expect(EmotionParser.isValidEmotion('excited')).toBe(false);
  });

  it('should clean emotion tags without removing malformed bracket text', () => {
    expect(EmotionParser.cleanEmotionTags('[happy] Hello [sad]')).toBe('Hello');
    expect(EmotionParser.cleanEmotionTags('[happy world] Hello')).toBe(
      '[happy world] Hello',
    );
  });

  it('should prepend an emotion tag without validating the emotion name', () => {
    expect(EmotionParser.addEmotionTag('custom', 'Hello')).toBe(
      '[custom] Hello',
    );
  });
});
