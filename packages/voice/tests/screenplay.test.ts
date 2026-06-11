import { describe, expect, it } from 'vitest';
import {
  screenplayToText,
  textsToScreenplay,
  textToScreenplay,
} from '../src/utils/screenplay';

describe('screenplay utilities', () => {
  it('should convert text with emotion tag to chat screenplay', () => {
    expect(textToScreenplay('[happy] Hello')).toEqual({
      emotion: 'happy',
      text: 'Hello',
    });
  });

  it('should convert plain text to chat screenplay', () => {
    expect(textToScreenplay('Hello')).toEqual({
      text: 'Hello',
    });
  });

  it('should convert multiple texts to chat screenplay entries', () => {
    expect(textsToScreenplay(['[sad] Bye', 'Hello'])).toEqual([
      {
        emotion: 'sad',
        text: 'Bye',
      },
      {
        text: 'Hello',
      },
    ]);
  });

  it('should convert chat screenplay back to text', () => {
    expect(screenplayToText({ emotion: 'angry', text: 'Stop' })).toBe(
      '[angry] Stop',
    );
    expect(screenplayToText({ text: 'Hello' })).toBe('Hello');
  });
});
