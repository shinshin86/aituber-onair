import { describe, expect, it } from 'vitest';
import { createMockWav } from '../server/mock-audio.js';
import {
  buildSystemPrompt,
  DEFAULT_PERSONA,
  DEFAULT_PERSONA_EN,
  DEFAULT_PERSONA_JA,
  LEGACY_DEFAULT_PERSONAS,
  resolvePersona,
  resolvePersonaForLanguage,
  resolveResponseLanguage,
} from '../server/system-prompt.js';

describe('character support server helpers', () => {
  it('keeps the default persona when the saved value is blank', () => {
    expect(resolvePersona('   ')).toBe(DEFAULT_PERSONA);
    expect(DEFAULT_PERSONA).toBe(DEFAULT_PERSONA_EN);
  });

  it('localizes built-in defaults while preserving an edited persona', () => {
    expect(resolvePersonaForLanguage(DEFAULT_PERSONA_EN, 'ja')).toBe(
      DEFAULT_PERSONA_JA,
    );
    expect(resolvePersonaForLanguage(LEGACY_DEFAULT_PERSONAS[0], 'ja')).toBe(
      DEFAULT_PERSONA_JA,
    );
    expect(resolvePersonaForLanguage('Custom Miko persona.', 'ja')).toBe(
      'Custom Miko persona.',
    );
  });

  it('adds the emotion contract and curated knowledge to the prompt', () => {
    const prompt = buildSystemPrompt('You are Test Miko.', 'Known fact.');

    expect(prompt).toContain('You are Test Miko.');
    expect(prompt).toContain('[happy]');
    expect(prompt).toContain('Reply in English');
    expect(prompt).toContain('1-3 natural spoken sentences');
    expect(prompt).toContain('Known fact.');
  });

  it('adds the selected response language to the system prompt', () => {
    const prompt = buildSystemPrompt('You are Test Miko.', 'Known fact.', 'ja');

    expect(prompt).toContain('Reply in Japanese');
    expect(
      buildSystemPrompt(DEFAULT_PERSONA_EN, 'Known fact.', 'ja'),
    ).toContain(DEFAULT_PERSONA_JA);
    expect(resolveResponseLanguage('ja')).toBe('ja');
    expect(resolveResponseLanguage('unsupported')).toBe('en');
  });

  it('creates a decodable PCM WAV envelope for local lip-sync checks', () => {
    const wav = createMockWav('Hello from Miko.');

    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(wav.subarray(36, 40).toString('ascii')).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    expect(wav.length).toBeGreaterThan(44 + 24_000);
  });
});
