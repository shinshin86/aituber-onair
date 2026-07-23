import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PERSONA_EN,
  DEFAULT_PERSONA_JA,
  resolvePersona,
} from '../server/system-prompt.js';

describe('support persona defaults', () => {
  it('provides distinct English and Japanese defaults', () => {
    expect(DEFAULT_PERSONA_EN).toContain('friendly support assistant');
    expect(DEFAULT_PERSONA_JA).toContain('親しみやすいサポートアシスタント');
  });

  it('uses the English default for empty persona text', () => {
    expect(resolvePersona('')).toBe(DEFAULT_PERSONA_EN);
    expect(resolvePersona('   ')).toBe(DEFAULT_PERSONA_EN);
    expect(resolvePersona(undefined)).toBe(DEFAULT_PERSONA_EN);
  });

  it('trims and preserves customized persona text', () => {
    expect(resolvePersona('  Custom persona  ')).toBe('Custom persona');
  });
});
