import { describe, expect, it } from 'vitest';
import {
  appendTranscript,
  DEFAULT_SPEECH_LANGUAGE,
  DEFAULT_SPEECH_RECOGNITION_MESSAGES,
  getSpeechRecognitionErrorMessage,
  resolveSpeechLanguage,
} from '../src/lib/speechRecognition';

describe('speech recognition helpers', () => {
  it('uses Japanese when the browser language is missing', () => {
    expect(resolveSpeechLanguage()).toBe(DEFAULT_SPEECH_LANGUAGE);
    expect(resolveSpeechLanguage('  ')).toBe(DEFAULT_SPEECH_LANGUAGE);
  });

  it('uses the browser language when one is available', () => {
    expect(resolveSpeechLanguage('en-US')).toBe('en-US');
  });

  it('joins Latin transcripts with a readable space', () => {
    expect(appendTranscript('hello', 'world')).toBe('hello world');
  });

  it('joins Japanese transcripts without inserting a space', () => {
    expect(appendTranscript('音声', '入力')).toBe('音声入力');
  });

  it('limits recognized text to the composer maximum', () => {
    expect(appendTranscript('hello', 'world', 8)).toBe('hello wo');
    expect(appendTranscript('', 'voice input', 5)).toBe('voice');
  });

  it('maps permission errors to a text-input fallback message', () => {
    expect(getSpeechRecognitionErrorMessage('not-allowed')).toContain(
      'keep typing',
    );
  });

  it('uses localized recognition error messages', () => {
    expect(
      getSpeechRecognitionErrorMessage('not-allowed', {
        ...DEFAULT_SPEECH_RECOGNITION_MESSAGES,
        permissionDenied: 'マイクを利用できません。',
      }),
    ).toBe('マイクを利用できません。');
  });

  it('does not surface expected aborts as errors', () => {
    expect(getSpeechRecognitionErrorMessage('aborted')).toBeNull();
  });
});
