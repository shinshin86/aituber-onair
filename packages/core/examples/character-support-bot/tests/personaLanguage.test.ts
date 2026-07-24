import { describe, expect, it } from 'vitest';
import {
  getLanguageAwareChatEndpoint,
  getSpeechRecognitionLanguage,
} from '../src/personaLanguage';

describe('persona language routing', () => {
  it('maps the display language to the speech recognition locale', () => {
    expect(getSpeechRecognitionLanguage('en')).toBe('en-US');
    expect(getSpeechRecognitionLanguage('ja')).toBe('ja-JP');
  });

  it('passes the selected language through the support endpoint', () => {
    expect(getLanguageAwareChatEndpoint('https://example.com', 'ja')).toBe(
      'https://example.com/api/support/chat/completions?language=ja',
    );
  });
});
