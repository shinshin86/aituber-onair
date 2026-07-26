import { describe, expect, it } from 'vitest';
import {
  EXCLUDED_SERVER_TTS_ENGINES,
  createVoiceServiceOptions,
  detectAudioContentType,
  getExcludedTtsProviderRecords,
  getTtsProvider,
  getTtsProviderRecords,
  normalizeStoredTtsSettings,
  normalizeTtsProviderId,
  validateTtsSettings,
} from '../server/tts-providers.js';

const EXPECTED_SERVER_ENGINES = [
  'voicevox',
  'voicepeak',
  'openai',
  'xai',
  'unrealSpeech',
  'elevenLabs',
  'inworld',
  'gradium',
  'geminiTts',
  'openaiCompatible',
  'aivisSpeech',
  'aivisCloud',
  'minimax',
  'mock',
];

describe('character support TTS providers', () => {
  it('enumerates every server audio engine plus the built-in mock', () => {
    expect(getTtsProviderRecords().map(({ provider }) => provider)).toEqual(
      EXPECTED_SERVER_ENGINES,
    );
  });

  it('publishes explicit reasons for every excluded voice engine', () => {
    expect([...EXCLUDED_SERVER_TTS_ENGINES.keys()]).toEqual([
      'piperPlus',
      'webSpeech',
      'none',
    ]);
    expect(getExcludedTtsProviderRecords()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'piperPlus',
          reason: expect.stringContaining('Browser-only'),
        }),
        expect.objectContaining({
          provider: 'webSpeech',
          reason: expect.stringContaining('audio bytes'),
        }),
        expect.objectContaining({
          provider: 'none',
          reason: expect.stringContaining('no audio bytes'),
        }),
      ]),
    );
  });

  it('derives key, endpoint, and voice-list support from voice capabilities', () => {
    expect(getTtsProvider('voicevox')).toMatchObject({
      requiresApiKey: false,
      supportsCustomEndpoint: true,
      supportsVoiceList: true,
    });
    expect(getTtsProvider('aivisSpeech')).toMatchObject({
      requiresApiKey: false,
      supportsCustomEndpoint: true,
      supportsVoiceList: true,
    });
    expect(getTtsProvider('elevenLabs')).toMatchObject({
      requiresApiKey: true,
      supportsCustomEndpoint: true,
      supportsVoiceList: true,
    });
  });

  it('migrates the legacy OpenAI-compatible provider ID', () => {
    expect(normalizeTtsProviderId('openai-compatible')).toBe(
      'openaiCompatible',
    );
    expect(
      normalizeStoredTtsSettings({
        provider: 'openai-compatible',
        model: 'kokoro',
        endpoint: 'http://127.0.0.1:8880/v1/audio/speech',
        speed: 1.25,
      }),
    ).toMatchObject({
      provider: 'openaiCompatible',
      model: 'kokoro',
      endpoint: 'http://127.0.0.1:8880/v1/audio/speech',
      speed: 1.25,
    });
  });

  it('validates local engines without requiring a key or model', () => {
    expect(
      validateTtsSettings(
        {
          provider: 'voicevox',
          model: '',
          voice: '3',
          endpoint: 'http://127.0.0.1:50021',
          speed: 1,
          groupId: '',
        },
        {},
      ),
    ).toEqual({
      provider: 'voicevox',
      model: '',
      voice: '3',
      apiKey: '',
      endpoint: 'http://127.0.0.1:50021',
      speed: 1,
      groupId: '',
    });
  });

  it('requires MiniMax credentials and Group ID', () => {
    const input = {
      provider: 'minimax',
      model: 'speech-2.6-hd',
      voice: 'Japanese_IntellectualSenior',
      endpoint: '',
      speed: 1,
      groupId: '',
    };

    expect(() => validateTtsSettings(input, {})).toThrow('server-side API key');
    expect(() =>
      validateTtsSettings({ ...input, apiKey: 'test-key' }, {}),
    ).toThrow('Group ID');
  });

  it('validates speed against each provider range', () => {
    const elevenLabsSettings = {
      provider: 'elevenLabs',
      model: 'eleven_multilingual_v2',
      voice: 'voice-id',
      apiKey: 'test-key',
      endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
      speed: 0.65,
      groupId: '',
    };

    expect(() => validateTtsSettings(elevenLabsSettings, {})).toThrow(
      'between 0.7 and 1.2',
    );
    expect(
      validateTtsSettings({ ...elevenLabsSettings, speed: 1.2 }, {}),
    ).toMatchObject({ speed: 1.2 });
  });

  it('maps generic settings onto the package adapter options', () => {
    expect(
      createVoiceServiceOptions(
        {
          provider: 'voicevox',
          model: '',
          voice: '3',
          apiKey: '',
          endpoint: 'http://127.0.0.1:50021',
          speed: 1.1,
          groupId: '',
        },
        async () => {},
      ),
    ).toMatchObject({
      engineType: 'voicevox',
      speaker: '3',
      voicevoxApiUrl: 'http://127.0.0.1:50021',
      voicevoxSpeedScale: 1.1,
    });
    expect(
      createVoiceServiceOptions(
        {
          provider: 'minimax',
          model: 'speech-2.6-hd',
          voice: 'Japanese_IntellectualSenior',
          apiKey: 'test-key',
          endpoint: '',
          speed: 1,
          groupId: 'test-group',
        },
        async () => {},
      ),
    ).toMatchObject({
      engineType: 'minimax',
      groupId: 'test-group',
      minimaxModel: 'speech-2.6-hd',
    });
  });

  it('detects common audio containers returned by voice engines', () => {
    expect(detectAudioContentType(Buffer.from('RIFF0000WAVE', 'ascii'))).toBe(
      'audio/wav',
    );
    expect(detectAudioContentType(Buffer.from('OggS', 'ascii'))).toBe(
      'audio/ogg',
    );
    expect(detectAudioContentType(Buffer.from('ID3', 'ascii'))).toBe(
      'audio/mpeg',
    );
    expect(detectAudioContentType(Buffer.from([1, 2, 3]))).toBe(
      'application/octet-stream',
    );
  });
});
