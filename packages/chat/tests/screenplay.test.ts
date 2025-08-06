import { describe, it, expect } from 'vitest';
import {
  textToScreenplay,
  textsToScreenplay,
  screenplayToText,
} from '../src/utils/screenplay';

describe('screenplay utilities', () => {
  describe('textToScreenplay', () => {
    it('should convert text with emotion tag to screenplay', () => {
      const screenplay = textToScreenplay('[happy] Hello world!');
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should convert text without emotion tag to screenplay', () => {
      const screenplay = textToScreenplay('Hello world!');
      expect(screenplay).toEqual({
        text: 'Hello world!',
      });
    });

    it('should handle empty text', () => {
      const screenplay = textToScreenplay('');
      expect(screenplay).toEqual({
        text: '',
      });
    });

    it('should handle text with only emotion tag', () => {
      const screenplay = textToScreenplay('[happy]');
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: '',
      });
    });

    it('should handle uppercase emotion tags', () => {
      const screenplay = textToScreenplay('[HAPPY] Hello!');
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello!',
      });
    });

    it('should handle multiple emotion tags', () => {
      const screenplay = textToScreenplay('[happy] Hello [sad] world!');
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should trim whitespace from text', () => {
      const screenplay = textToScreenplay('[happy]   Hello world!   ');
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });
  });

  describe('textsToScreenplay', () => {
    it('should convert array of texts to screenplay array', () => {
      const texts = ['[happy] Hello!', 'How are you?', '[sad] Goodbye'];
      const screenplays = textsToScreenplay(texts);

      expect(screenplays).toEqual([
        { emotion: 'happy', text: 'Hello!' },
        { text: 'How are you?' },
        { emotion: 'sad', text: 'Goodbye' },
      ]);
    });

    it('should handle empty array', () => {
      const screenplays = textsToScreenplay([]);
      expect(screenplays).toEqual([]);
    });

    it('should handle array with empty strings', () => {
      const texts = ['', '[happy]', '   '];
      const screenplays = textsToScreenplay(texts);

      expect(screenplays).toEqual([
        { text: '' },
        { emotion: 'happy', text: '' },
        { text: '   ' },
      ]);
    });
  });

  describe('screenplayToText', () => {
    it('should convert screenplay with emotion to text', () => {
      const screenplay = {
        emotion: 'happy',
        text: 'Hello world!',
      };
      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] Hello world!');
    });

    it('should convert screenplay without emotion to text', () => {
      const screenplay = {
        text: 'Hello world!',
      };
      const text = screenplayToText(screenplay);
      expect(text).toBe('Hello world!');
    });

    it('should handle empty text', () => {
      const screenplay = {
        text: '',
      };
      const text = screenplayToText(screenplay);
      expect(text).toBe('');
    });

    it('should handle screenplay with emotion and empty text', () => {
      const screenplay = {
        emotion: 'happy',
        text: '',
      };
      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] ');
    });

    it('should preserve emotion case', () => {
      const screenplay = {
        emotion: 'HAPPY',
        text: 'Hello!',
      };
      const text = screenplayToText(screenplay);
      expect(text).toBe('[HAPPY] Hello!');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through conversion', () => {
      const originalText = '[happy] Hello world!';
      const screenplay = textToScreenplay(originalText);
      const convertedText = screenplayToText(screenplay);
      expect(convertedText).toBe(originalText);
    });

    it('should handle text without emotion through conversion', () => {
      const originalText = 'Hello world!';
      const screenplay = textToScreenplay(originalText);
      const convertedText = screenplayToText(screenplay);
      expect(convertedText).toBe(originalText);
    });
  });
});
