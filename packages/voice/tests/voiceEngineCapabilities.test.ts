import { describe, expect, it } from 'vitest';
import {
  getAllVoiceEngineCapabilities,
  getVoiceEngineCapabilities,
} from '../src/index';

describe('voice engine capabilities', () => {
  it('describes API key and endpoint requirements for cloud engines', () => {
    const openai = getVoiceEngineCapabilities('openai');

    expect(openai.requiresApiKey).toBe(true);
    expect(openai.supportsCustomEndpoint).toBe(false);
    expect(openai.runtimes).toContain('browser');
  });

  it('describes local endpoint engines', () => {
    const voicevox = getVoiceEngineCapabilities('voicevox');

    expect(voicevox.requiresApiKey).toBe(false);
    expect(voicevox.supportsCustomEndpoint).toBe(true);
    expect(voicevox.supportsEmotion).toBe(true);
  });

  it('describes silent mode as agent-safe and keyless', () => {
    const none = getVoiceEngineCapabilities('none');

    expect(none.requiresApiKey).toBe(false);
    expect(none.supportsEmotion).toBe(true);
    expect(none.runtimes).toEqual(['browser', 'node', 'server']);
  });

  it('lists all voice engine capabilities', () => {
    const capabilities = getAllVoiceEngineCapabilities();

    expect(capabilities.map((item) => item.engineType)).toContain('minimax');
    expect(capabilities.map((item) => item.engineType)).toContain(
      'openaiCompatible',
    );
  });
});
