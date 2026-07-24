import { describe, expect, it } from 'vitest';
import { detectBrowserLanguage, resolveInitialLanguage } from '../src/i18n';

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
});
