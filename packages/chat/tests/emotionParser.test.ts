import { describe, it, expect } from 'vitest';
import { EmotionParser } from '../src/utils/emotionParser';

describe('EmotionParser', () => {
  describe('extractEmotion', () => {
    it('should extract emotion tag from text', () => {
      const result = EmotionParser.extractEmotion('[happy] Hello world!');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle uppercase emotion tags', () => {
      const result = EmotionParser.extractEmotion('[HAPPY] Hello world!');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle mixed case emotion tags', () => {
      const result = EmotionParser.extractEmotion('[HaPpY] Hello world!');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should return original text when no emotion tag exists', () => {
      const result = EmotionParser.extractEmotion('Hello world!');
      expect(result.emotion).toBeUndefined();
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle multiple emotion tags by extracting first one', () => {
      const result = EmotionParser.extractEmotion('[happy] Hello [sad] world!');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle emotion tag in the middle of text', () => {
      const result = EmotionParser.extractEmotion('Hello [happy] world!');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle emotion tag at the end of text', () => {
      const result = EmotionParser.extractEmotion('Hello world! [happy]');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });

    it('should handle empty text', () => {
      const result = EmotionParser.extractEmotion('');
      expect(result.emotion).toBeUndefined();
      expect(result.cleanText).toBe('');
    });

    it('should handle text with only emotion tag', () => {
      const result = EmotionParser.extractEmotion('[happy]');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('');
    });

    it('should trim whitespace from clean text', () => {
      const result = EmotionParser.extractEmotion('[happy]   Hello world!   ');
      expect(result.emotion).toBe('happy');
      expect(result.cleanText).toBe('Hello world!');
    });
  });

  describe('isValidEmotion', () => {
    it('should return true for valid emotions', () => {
      expect(EmotionParser.isValidEmotion('happy')).toBe(true);
      expect(EmotionParser.isValidEmotion('sad')).toBe(true);
      expect(EmotionParser.isValidEmotion('angry')).toBe(true);
      expect(EmotionParser.isValidEmotion('surprised')).toBe(true);
      expect(EmotionParser.isValidEmotion('neutral')).toBe(true);
    });

    it('should return false for invalid emotions', () => {
      expect(EmotionParser.isValidEmotion('excited')).toBe(false);
      expect(EmotionParser.isValidEmotion('confused')).toBe(false);
      expect(EmotionParser.isValidEmotion('HAPPY')).toBe(false);
      expect(EmotionParser.isValidEmotion('')).toBe(false);
    });
  });

  describe('cleanEmotionTags', () => {
    it('should remove single emotion tag', () => {
      const result = EmotionParser.cleanEmotionTags('[happy] Hello world!');
      expect(result).toBe('Hello world!');
    });

    it('should remove multiple emotion tags', () => {
      const result = EmotionParser.cleanEmotionTags(
        '[happy] Hello [sad] world [angry]!',
      );
      expect(result).toBe('Hello world !');
    });

    it('should handle text without emotion tags', () => {
      const result = EmotionParser.cleanEmotionTags('Hello world!');
      expect(result).toBe('Hello world!');
    });

    it('should handle empty text', () => {
      const result = EmotionParser.cleanEmotionTags('');
      expect(result).toBe('');
    });

    it('should trim resulting text', () => {
      const result = EmotionParser.cleanEmotionTags(
        '[happy]   Hello world!   ',
      );
      expect(result).toBe('Hello world!');
    });

    it('should handle text with only emotion tags', () => {
      const result = EmotionParser.cleanEmotionTags('[happy] [sad] [angry]');
      expect(result).toBe('');
    });
  });

  describe('addEmotionTag', () => {
    it('should add emotion tag to text', () => {
      const result = EmotionParser.addEmotionTag('happy', 'Hello world!');
      expect(result).toBe('[happy] Hello world!');
    });

    it('should handle empty text', () => {
      const result = EmotionParser.addEmotionTag('happy', '');
      expect(result).toBe('[happy] ');
    });

    it('should handle emotion with different cases', () => {
      const result = EmotionParser.addEmotionTag('HAPPY', 'Hello world!');
      expect(result).toBe('[HAPPY] Hello world!');
    });
  });
});
