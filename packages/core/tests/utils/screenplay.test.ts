import { describe, it, expect } from 'vitest';
import {
  textToScreenplay,
  screenplayToText,
  textsToScreenplay,
} from '../../src/utils/screenplay';

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
  });
});
