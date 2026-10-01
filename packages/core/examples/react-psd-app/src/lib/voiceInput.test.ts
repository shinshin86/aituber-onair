import { describe, expect, it } from 'vitest';
import {
  VOICE_INPUT_RETRY_LIMIT,
  isVoiceInputMode,
  isVoiceInputService,
  shouldRetryVoiceInput,
  voiceInputNoticeForError,
} from './voiceInput';

describe('voice input settings', () => {
  it('accepts only known modes and services', () => {
    expect(isVoiceInputMode('once')).toBe(true);
    expect(isVoiceInputMode('continuous')).toBe(true);
    expect(isVoiceInputMode('always')).toBe(false);
    expect(isVoiceInputService('browser')).toBe(true);
    expect(isVoiceInputService('openai')).toBe(true);
    expect(isVoiceInputService('gemini')).toBe(true);
    expect(isVoiceInputService('whisper')).toBe(false);
  });
});

describe('shouldRetryVoiceInput', () => {
  const waiting = {
    mode: 'continuous' as const,
    sessionActive: true,
    awaitingReply: false,
    retryCount: 0,
  };

  it('retries a dropped connection while continuous mode waits', () => {
    expect(
      shouldRetryVoiceInput({ ...waiting, code: 'connection-failed' }),
    ).toBe(true);
  });

  it('does not retry permission or key failures', () => {
    expect(
      shouldRetryVoiceInput({ ...waiting, code: 'permission-denied' }),
    ).toBe(false);
    expect(
      shouldRetryVoiceInput({ ...waiting, code: 'authentication-failed' }),
    ).toBe(false);
  });

  it('stops retrying after the limit or outside continuous mode', () => {
    expect(
      shouldRetryVoiceInput({
        ...waiting,
        code: 'connection-failed',
        retryCount: VOICE_INPUT_RETRY_LIMIT,
      }),
    ).toBe(false);
    expect(
      shouldRetryVoiceInput({
        ...waiting,
        code: 'connection-failed',
        mode: 'once',
      }),
    ).toBe(false);
  });
});

describe('voiceInputNoticeForError', () => {
  it('maps key failures to the selected cloud service', () => {
    expect(voiceInputNoticeForError('client-secret-failed', 'openai')).toEqual({
      type: 'auth',
      service: 'openai',
    });
    expect(
      voiceInputNoticeForError('ephemeral-token-failed', 'gemini'),
    ).toEqual({ type: 'auth', service: 'gemini' });
  });

  it('maps permission and support errors', () => {
    expect(voiceInputNoticeForError('permission-denied', 'browser')).toEqual({
      type: 'permission',
    });
    expect(voiceInputNoticeForError('unsupported-provider', 'browser')).toEqual(
      { type: 'unsupported' },
    );
    expect(voiceInputNoticeForError('connection-failed', 'openai')).toEqual({
      type: 'connection',
    });
  });
});
