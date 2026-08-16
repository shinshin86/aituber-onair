import { describe, expect, it } from 'vitest';
import {
  detectDisplayLanguage,
  isDisplayLanguage,
  isTranslationKey,
  translate,
  translatedValues,
} from './i18n';

describe('browser example i18n', () => {
  it('selects Japanese when any browser language is Japanese', () => {
    expect(detectDisplayLanguage(['en-US', 'ja-JP'])).toBe('ja');
    expect(detectDisplayLanguage(['en-US'])).toBe('en');
  });

  it('provides matching English and Japanese messages', () => {
    expect(isDisplayLanguage('ja')).toBe(true);
    expect(isTranslationKey('startMicrophone')).toBe(true);
    expect(translate('ja', 'startMicrophone')).toBe('文字起こしを開始');
    expect(translatedValues('keywordsValue')).toEqual([
      'OpenAI, realtime transcription',
      'OpenAI, リアルタイム文字起こし',
    ]);
    expect(translatedValues('contextPromptValue')).toEqual([
      'An English conversation recorded through a microphone.',
      'マイクから入力された日本語の会話です。',
    ]);
    expect(translate('ja', 'localWhisperNotice')).toContain('約120MB');
    expect(translate('en', 'localWhisperNotice')).toContain(
      'Microphone audio stays in this browser.'
    );
  });
});
