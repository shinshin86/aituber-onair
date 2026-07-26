import { describe, expect, it } from 'vitest';
import {
  detectBrowserLanguage,
  resolveInitialLanguage,
  translations,
} from '../src/i18n';

describe('character support language preference', () => {
  it('uses a valid stored language before browser detection', () => {
    expect(resolveInitialLanguage('en', 'ja-JP')).toBe('en');
    expect(resolveInitialLanguage('ja', 'en-US')).toBe('ja');
  });

  it('falls back to the browser language for invalid stored values', () => {
    expect(resolveInitialLanguage(undefined, 'ja-JP')).toBe('ja');
    expect(resolveInitialLanguage('fr', 'en-US')).toBe('en');
  });

  it('defaults non-Japanese browser locales to English', () => {
    expect(detectBrowserLanguage('fr-FR')).toBe('en');
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('keeps chat placeholders short enough for one-line display', () => {
    expect(translations.en.chat.inputPlaceholder.length).toBeLessThan(30);
    expect(translations.ja.chat.inputPlaceholder.length).toBeLessThan(20);
    expect(translations.en.chat.inputPlaceholder).not.toContain('\n');
    expect(translations.ja.chat.inputPlaceholder).not.toContain('\n');
  });

  it('describes the example directly instead of using slogan copy', () => {
    expect(translations.en.hero.titleLead).not.toContain('Give your AI');
    expect(translations.en.hero.description).toContain('@aituber-onair/core');
    expect(translations.ja.hero.description).toContain('@aituber-onair/core');
  });

  it('localizes voice selection and unknown saved voice labels', () => {
    expect(translations.en.admin.selectVoice).toBe('Select a voice');
    expect(translations.ja.admin.selectVoice).toBe('音声を選択');
    expect(translations.en.admin.unknownSavedVoice).toContain('{id}');
    expect(translations.ja.admin.unknownSavedVoice).toContain('{id}');
  });
});
