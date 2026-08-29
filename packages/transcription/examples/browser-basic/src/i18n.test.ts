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
    expect(translatedValues('geminiKeywordsValue')).toEqual([
      'AITuber OnAir, Gemini',
      'AITuber OnAir, Gemini',
    ]);
    expect(translate('ja', 'geminiCost')).toContain('最大10分');
    expect(translate('en', 'geminiBrowserByokNotice')).toContain(
      'ephemeral token'
    );
    expect(translate('ja', 'localWhisperModelTinyHint')).toContain('約122MB');
    expect(translate('ja', 'localWhisperModelBaseHint')).toContain('約209MB');
    expect(translate('ja', 'localWhisperModelSmallHint')).toContain('約589MB');
    expect(translate('ja', 'progressDownloadModel')).toContain('初回のみ');
    expect(translate('ja', 'progressInitializeModel')).toBe('モデルを初期化中');
    expect(translate('ja', 'errorTechnicalDetails')).toBe('詳細');
    expect(translate('en', 'progressDownloadModel')).toContain(
      'first use only'
    );
    expect(translate('en', 'localWhisperNotice')).toContain(
      'Microphone audio stays in this browser.'
    );
    expect(translate('en', 'localWhisperModelTinyHint')).toContain(
      'lower recognition quality'
    );
    expect(translate('en', 'localWhisperModelBaseHint')).toContain(
      'balancing recognition quality and speed'
    );
    expect(translate('en', 'localWhisperModelSmallHint')).toContain(
      'inference can be slow'
    );
  });
});
