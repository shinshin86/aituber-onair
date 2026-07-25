import { describe, expect, it } from 'vitest';
import {
  getLanguageAwareChatEndpoint,
  getSpeechRecognitionLanguage,
  resolvePersonaForLanguage,
} from '../src/personaLanguage';

const defaultPersonas = {
  en: 'English default persona',
  ja: '日本語の既定ペルソナ',
};

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

  it('localizes built-in default personas to the display language', () => {
    expect(
      resolvePersonaForLanguage(defaultPersonas.en, defaultPersonas, 'ja'),
    ).toBe(defaultPersonas.ja);
    expect(
      resolvePersonaForLanguage(defaultPersonas.ja, defaultPersonas, 'en'),
    ).toBe(defaultPersonas.en);
  });

  it('recognizes legacy defaults without replacing edited personas', () => {
    expect(
      resolvePersonaForLanguage(
        'Legacy default persona',
        defaultPersonas,
        'ja',
        ['Legacy default persona'],
      ),
    ).toBe(defaultPersonas.ja);
    expect(
      resolvePersonaForLanguage('My edited persona', defaultPersonas, 'ja', [
        'Legacy default persona',
      ]),
    ).toBe('My edited persona');
  });
});
