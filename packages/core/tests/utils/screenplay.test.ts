import { describe, it, expect } from 'vitest';
import {
  textToScreenplay,
  screenplayToText,
  textsToScreenplay,
} from '@aituber-onair/chat';

describe('Screenplay Utils', () => {
  describe('textToScreenplay', () => {
    it('should extract emotion from text with emotion tag', () => {
      // Arrange
      const text = '[happy] Hello world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should return text without emotion if no emotion tag', () => {
      // Arrange
      const text = 'Hello world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        text: 'Hello world!',
      });
    });

    it('should handle whitespace correctly', () => {
      // Arrange
      const text = '  [sad]  Hello world!  ';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'sad',
        text: 'Hello world!',
      });
    });

    it('should extract emotion from text with emotion tag in the middle', () => {
      // Arrange
      const text = 'Hello [happy] world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle multiple emotion tags and use the first one', () => {
      // Arrange
      const text = '[happy] Hello [sad] world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should extract emotion from text with emotion tag at the end', () => {
      // Arrange
      const text = 'Hello world! [happy]';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle uppercase emotion tags', () => {
      // Arrange
      const text = '[HAPPY] Hello world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle multiple words with multiple emotion tags', () => {
      // Arrange
      const text = '[happy] Hello [sad] beautiful [angry] world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello beautiful world!',
      });
    });

    it('should handle consecutive emotion tags', () => {
      // Arrange
      const text = '[happy][sad][angry] Hello world!';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle text with only whitespace and emotion tag', () => {
      // Arrange
      const text = '   [happy]   ';

      // Act
      const screenplay = textToScreenplay(text);

      // Assert
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: '',
      });
    });

    it('should handle empty string', () => {
      const text = '';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({ text: '' });
    });

    it('should handle null input', () => {
      expect(() => textToScreenplay(null as any)).toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => textToScreenplay(undefined as any)).toThrow();
    });

    it('should handle emotion tag with numbers (should not match)', () => {
      const text = '[happy123] Hello world!';
      const screenplay = textToScreenplay(text);
      // Numbers in emotion tags should not match the regex [a-z]+
      expect(screenplay).toEqual({ text: '[happy123] Hello world!' });
    });

    it('should handle emotion tag with special characters (should not match)', () => {
      const text = '[happy-sad] Hello world!';
      const screenplay = textToScreenplay(text);
      // Should not match because regex only allows [a-z]
      expect(screenplay).toEqual({ text: '[happy-sad] Hello world!' });
    });

    it('should handle emotion tag with mixed case and extract lowercase', () => {
      const text = '[HaPpY] Hello world!';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle very long emotion tag', () => {
      const longEmotion = 'a'.repeat(100);
      const text = `[${longEmotion}] Hello world!`;
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: longEmotion,
        text: 'Hello world!',
      });
    });

    it('should handle text with only emotion tags', () => {
      const text = '[happy][sad][angry]';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: '',
      });
    });

    it('should handle malformed emotion tags', () => {
      const text = '[happy Hello world!'; // Missing closing bracket
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({ text: '[happy Hello world!' });
    });

    it('should handle emotion tag at start with no space', () => {
      const text = '[happy]Hello world!';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle multiple spaces between emotion tag and text', () => {
      const text = '[happy]     Hello world!';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello world!',
      });
    });

    it('should handle text with brackets but no emotion', () => {
      const text = 'Hello [world] how are you?';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'world',
        text: 'Hello how are you?',
      });
    });

    it('should handle empty emotion tag', () => {
      const text = '[] Hello world!';
      const screenplay = textToScreenplay(text);
      // Empty emotion tag should not match
      expect(screenplay).toEqual({ text: '[] Hello world!' });
    });

    it('should handle very long text', () => {
      const longText = 'Hello '.repeat(1000);
      const text = `[happy] ${longText}`;
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: longText.trim(),
      });
    });

    it('should handle text with unicode characters', () => {
      const text = '[happy] こんにちは 🎉 世界！';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'こんにちは 🎉 世界！',
      });
    });

    it('should handle text with newlines and tabs', () => {
      const text = '[happy] Hello\nworld\ttest!';
      const screenplay = textToScreenplay(text);
      expect(screenplay).toEqual({
        emotion: 'happy',
        text: 'Hello\nworld\ttest!',
      });
    });
  });

  describe('screenplayToText', () => {
    it('should convert screenplay with emotion to text', () => {
      // Arrange
      const screenplay = {
        emotion: 'happy',
        text: 'Hello world!',
      };

      // Act
      const text = screenplayToText(screenplay);

      // Assert
      expect(text).toBe('[happy] Hello world!');
    });

    it('should return only text if no emotion in screenplay', () => {
      // Arrange
      const screenplay = {
        text: 'Hello world!',
      };

      // Act
      const text = screenplayToText(screenplay);

      // Assert
      expect(text).toBe('Hello world!');
    });

    it('should handle screenplay with empty emotion', () => {
      const screenplay = {
        emotion: '',
        text: 'Hello world!',
      };

      const text = screenplayToText(screenplay);
      // Empty emotion is falsy, so it should not include emotion tag
      expect(text).toBe('Hello world!');
    });

    it('should handle screenplay with empty text', () => {
      const screenplay = {
        emotion: 'happy',
        text: '',
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] ');
    });

    it('should handle screenplay with both empty emotion and text', () => {
      const screenplay = {
        emotion: '',
        text: '',
      };

      const text = screenplayToText(screenplay);
      // Empty emotion is falsy, so it should not include emotion tag
      expect(text).toBe('');
    });

    it('should handle screenplay with null text', () => {
      const screenplay = {
        emotion: 'happy',
        text: null as any,
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] null');
    });

    it('should handle screenplay with undefined text', () => {
      const screenplay = {
        emotion: 'happy',
        text: undefined as any,
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] undefined');
    });

    it('should handle screenplay with null emotion', () => {
      const screenplay = {
        emotion: null as any,
        text: 'Hello world!',
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('Hello world!');
    });

    it('should handle screenplay with undefined emotion', () => {
      const screenplay = {
        emotion: undefined,
        text: 'Hello world!',
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('Hello world!');
    });

    it('should handle screenplay with special characters in emotion', () => {
      const screenplay = {
        emotion: 'happy-sad',
        text: 'Hello world!',
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy-sad] Hello world!');
    });

    it('should handle screenplay with unicode characters', () => {
      const screenplay = {
        emotion: 'happy',
        text: 'こんにちは 🎉 世界！',
      };

      const text = screenplayToText(screenplay);
      expect(text).toBe('[happy] こんにちは 🎉 世界！');
    });

    it('should handle null screenplay object', () => {
      expect(() => screenplayToText(null as any)).toThrow();
    });

    it('should handle undefined screenplay object', () => {
      expect(() => screenplayToText(undefined as any)).toThrow();
    });
  });

  describe('textsToScreenplay', () => {
    it('should convert array of texts to array of screenplays', () => {
      // Arrange
      const texts = ['[happy] Hello', 'How are you?', '[sad] Goodbye'];

      // Act
      const screenplays = textsToScreenplay(texts);

      // Assert
      expect(screenplays).toEqual([
        { emotion: 'happy', text: 'Hello' },
        { text: 'How are you?' },
        { emotion: 'sad', text: 'Goodbye' },
      ]);
    });

    it('should return empty array for empty input', () => {
      // Arrange
      const texts: string[] = [];

      // Act
      const screenplays = textsToScreenplay(texts);

      // Assert
      expect(screenplays).toEqual([]);
    });

    it('should handle null input', () => {
      expect(() => textsToScreenplay(null as any)).toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => textsToScreenplay(undefined as any)).toThrow();
    });

    it('should handle array with null elements', () => {
      const texts = ['[happy] Hello', null as any, '[sad] Goodbye'];
      expect(() => textsToScreenplay(texts)).toThrow();
    });

    it('should handle array with undefined elements', () => {
      const texts = ['[happy] Hello', undefined as any, '[sad] Goodbye'];
      expect(() => textsToScreenplay(texts)).toThrow();
    });

    it('should handle array with empty strings', () => {
      const texts = ['[happy] Hello', '', '[sad] Goodbye'];
      const screenplays = textsToScreenplay(texts);

      expect(screenplays).toEqual([
        { emotion: 'happy', text: 'Hello' },
        { text: '' },
        { emotion: 'sad', text: 'Goodbye' },
      ]);
    });

    it('should handle very large array', () => {
      const texts = Array.from({ length: 1000 }, (_, i) => `[happy] Text ${i}`);
      const screenplays = textsToScreenplay(texts);

      expect(screenplays).toHaveLength(1000);
      expect(screenplays[0]).toEqual({ emotion: 'happy', text: 'Text 0' });
      expect(screenplays[999]).toEqual({ emotion: 'happy', text: 'Text 999' });
    });

    it('should handle array with mixed valid and invalid elements', () => {
      const texts = [
        '[happy] Valid text',
        123 as any, // number
        '[sad] Another valid text',
        {} as any, // object
        '[angry] Last valid text',
      ];

      expect(() => textsToScreenplay(texts)).toThrow();
    });
  });
});
