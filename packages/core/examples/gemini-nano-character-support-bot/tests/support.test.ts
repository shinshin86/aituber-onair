import { describe, expect, it } from 'vitest';
import {
  getAssistantText,
  normalizeScreenplayEvent,
} from '../src/hooks/useCharacterSupportCore';
import { getSyntheticMouthLevel } from '../src/hooks/useSyntheticLipsync';
import {
  buildSupportSystemPrompt,
  getGeminiNanoLanguageOptions,
  getWebSpeechLanguage,
  normalizeEmotion,
  PACKAGE_KNOWLEDGE,
  resolveAvatarPackageUrl,
  stripEmotionTag,
  SUPPORT_RESPONSE_LENGTH,
} from '../src/support';

describe('Gemini Nano character support configuration', () => {
  it('resolves the avatar below the configured Vite base path', () => {
    expect(resolveAvatarPackageUrl('/')).toBe('/avatar/miko.purupuru');
    expect(resolveAvatarPackageUrl('/aituber-onair/demo/')).toBe(
      '/aituber-onair/demo/avatar/miko.purupuru',
    );
  });

  it('configures the selected chat and speech languages', () => {
    expect(getGeminiNanoLanguageOptions('en')).toEqual({
      expectedInputLanguages: ['en'],
      expectedOutputLanguages: ['en'],
    });
    expect(getGeminiNanoLanguageOptions('ja')).toEqual({
      expectedInputLanguages: ['en', 'ja'],
      expectedOutputLanguages: ['ja'],
    });
    expect(getWebSpeechLanguage('en')).toBe('en-US');
    expect(getWebSpeechLanguage('ja')).toBe('ja-JP');
  });

  it('requests a one-sentence tagged response in the selected language', () => {
    expect(SUPPORT_RESPONSE_LENGTH).toBe('veryShort');
    expect(buildSupportSystemPrompt('en')).toContain(
      'Reply in exactly one short sentence',
    );
    expect(buildSupportSystemPrompt('en')).toContain(
      'Start every reply with exactly one emotion tag',
    );
    expect(buildSupportSystemPrompt('ja')).toContain(
      '必ず日本語で回答してください',
    );
  });

  it('bundles compact public Core knowledge', () => {
    expect(PACKAGE_KNOWLEDGE).toContain('# @aituber-onair/core');
    expect(PACKAGE_KNOWLEDGE).toContain('## Browser-only setup');
    expect(PACKAGE_KNOWLEDGE.length).toBeLessThan(10_000);
  });
});

describe('emotion handling', () => {
  it('removes only a leading emotion tag from visible text', () => {
    expect(stripEmotionTag('[happy] Hello!')).toBe('Hello!');
    expect(stripEmotionTag('  [relaxed]  Ready.  ')).toBe('Ready.');
    expect(stripEmotionTag('Use [happy] in a prompt.')).toBe(
      'Use [happy] in a prompt.',
    );
  });

  it('falls back to neutral for missing or unsupported emotions', () => {
    expect(normalizeEmotion(undefined)).toBe('neutral');
    expect(normalizeEmotion('thinking')).toBe('neutral');
    expect(normalizeEmotion(' HAPPY ')).toBe('happy');
  });

  it('normalizes both direct and wrapped screenplay events', () => {
    expect(normalizeScreenplayEvent({ text: 'Hello' })).toEqual({
      emotion: 'neutral',
      text: 'Hello',
    });
    expect(
      normalizeScreenplayEvent({
        screenplay: { emotion: 'surprised', text: 'Oh!' },
      }),
    ).toEqual({ emotion: 'surprised', text: 'Oh!' });
    expect(normalizeScreenplayEvent(null)).toBeNull();
  });

  it('extracts clean assistant text from Core response payloads', () => {
    expect(getAssistantText('[happy] Hello!')).toBe('Hello!');
    expect(
      getAssistantText({
        message: { content: '[sad] Please check the README.' },
      }),
    ).toBe('Please check the README.');
  });
});

describe('synthetic lip sync', () => {
  it('keeps the mouth level inside the avatar renderer range', () => {
    const levels = Array.from({ length: 80 }, (_, index) =>
      getSyntheticMouthLevel(index * 25),
    );
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...levels)).toBeLessThanOrEqual(0.115);
    expect(
      new Set(levels.map((level) => level.toFixed(4))).size,
    ).toBeGreaterThan(20);
  });

  it('returns a closed mouth for invalid elapsed time', () => {
    expect(getSyntheticMouthLevel(-1)).toBe(0);
    expect(getSyntheticMouthLevel(Number.NaN)).toBe(0);
  });
});
