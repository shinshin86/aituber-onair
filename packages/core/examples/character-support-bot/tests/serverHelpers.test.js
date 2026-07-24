import { describe, expect, it } from 'vitest';
import { createMockWav } from '../server/mock-audio.js';
import {
  buildSystemPrompt,
  DEFAULT_PERSONA,
  resolvePersona,
  resolveResponseLanguage,
} from '../server/system-prompt.js';

describe('character support server helpers', () => {
  it('keeps the default persona when the saved value is blank', () => {
    expect(resolvePersona('   ')).toBe(DEFAULT_PERSONA);
  });

  it('adds the emotion contract and curated knowledge to the prompt', () => {
    const prompt = buildSystemPrompt('You are Test Miko.', 'Known fact.');

    expect(prompt).toContain('You are Test Miko.');
    expect(prompt).toContain('[happy]');
    expect(prompt).toContain('Reply in English');
    expect(prompt).toContain('Known fact.');
  });

  it('adds the selected response language to the system prompt', () => {
    const prompt = buildSystemPrompt('You are Test Miko.', 'Known fact.', 'ja');

    expect(prompt).toContain('Reply in Japanese');
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
