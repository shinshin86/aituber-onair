import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEEPGRAM_DEFAULT_VOICE,
  DEEPGRAM_TTS_API_URL,
  DEEPGRAM_VOICES_API_URL,
  DeepgramEngine,
  type DeepgramVoiceServiceOptions,
  type DeepgramVoiceServiceOptionsUpdate,
  VoiceEngineAdapter,
  VoiceEngineFactory,
  getAllVoiceEngineCapabilities,
  getVoiceEngineCapabilities,
  getVoiceEngineVoiceList,
} from '../src';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Deepgram public integration', () => {
  it('exports the engine, endpoint constants, options and factory registration', () => {
    const options: DeepgramVoiceServiceOptions = {
      engineType: 'deepgram',
      speaker: DEEPGRAM_DEFAULT_VOICE,
      apiKey: 'test-key',
      deepgramApiUrl: 'https://example.test/flux',
      deepgramSpeed: 1.1,
    };
    const update: DeepgramVoiceServiceOptionsUpdate = { deepgramSpeed: 0.9 };

    expect(VoiceEngineFactory.getEngine(options.engineType)).toBeInstanceOf(
      DeepgramEngine,
    );
    expect(update.deepgramSpeed).toBe(0.9);
    expect(DEEPGRAM_TTS_API_URL).toBe('https://api.deepgram.com/v2/speak');
    expect(DEEPGRAM_VOICES_API_URL).toBe('https://api.deepgram.com/v2/models');
    expect(DEEPGRAM_DEFAULT_VOICE).toBe('flux-haley-en');
  });

  it('declares only implemented capabilities', () => {
    expect(getVoiceEngineCapabilities('deepgram')).toEqual({
      engineType: 'deepgram',
      requiresApiKey: true,
      supportsEmotion: false,
      supportsVoiceList: true,
      supportsCustomEndpoint: true,
      runtimes: ['browser', 'node', 'server'],
    });
    expect(
      getAllVoiceEngineCapabilities().map((item) => item.engineType),
    ).toContain('deepgram');
  });

  it('applies initial options and runtime updates through the real adapter', async () => {
    const audio = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: async () => audio,
    } as Response);
    const onPlay = vi.fn().mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new VoiceEngineAdapter({
      engineType: 'deepgram',
      speaker: DEEPGRAM_DEFAULT_VOICE,
      apiKey: 'initial-key',
      deepgramApiUrl: 'https://example.test/initial',
      deepgramSpeed: 1.1,
      onPlay,
    });

    await adapter.speakText('Initial speech');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://example.test/initial?model=flux-haley-en&encoding=mp3&speed=1.1',
    );

    adapter.updateOptions({
      speaker: 'flux-kit-en',
      apiKey: 'updated-key',
      deepgramApiUrl: 'https://example.test/updated',
      deepgramSpeed: 0.8,
    });
    await adapter.speakText('Updated speech');

    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://example.test/updated?model=flux-kit-en&encoding=mp3&speed=0.8',
    );
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({
      Authorization: 'Token updated-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      text: 'Updated speech',
    });

    adapter.updateOptions({
      deepgramApiUrl: undefined,
      deepgramSpeed: undefined,
    });
    await adapter.speakText('Reset speech');
    expect(fetchMock.mock.calls[2][0]).toBe(
      `${DEEPGRAM_TTS_API_URL}?model=flux-kit-en&encoding=mp3`,
    );
    expect(onPlay).toHaveBeenCalledTimes(3);
    expect(onPlay).toHaveBeenLastCalledWith(audio, undefined);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Deepgram voice catalog', () => {
  const modelResponse = {
    stt: [{ canonical_name: 'flux-general-en', name: 'STT' }],
    tts: [
      {
        canonical_name: 'flux-haley-en',
        name: 'haley',
        languages: ['en', 'en-US'],
        metadata: {
          accent: 'American',
          display_name: 'Haley',
          sample: 'https://example.test/haley.wav',
          tags: ['feminine'],
        },
      },
      {
        canonical_name: 'flux-kit-en',
        name: 'Kit',
        languages: ['en', 'en-GB'],
      },
      { canonical_name: 'aura-2-thalia-en', name: 'Aura' },
      { canonical_name: 'flux-example-ja', name: 'Unsupported language' },
    ],
  };

  it('normalizes only supported Flux English voices without sending a key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => modelResponse,
    } as Response);

    await expect(
      getVoiceEngineVoiceList('deepgram', { apiKey: 'do-not-send' }),
    ).resolves.toEqual([
      {
        id: 'flux-haley-en',
        label: 'Haley (American)',
        metadata: {
          languages: 'en, en-US',
          accent: 'American',
          sample: 'https://example.test/haley.wav',
          tags: 'feminine',
        },
      },
      {
        id: 'flux-kit-en',
        label: 'Kit',
        metadata: { languages: 'en, en-GB' },
      },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(DEEPGRAM_VOICES_API_URL);
    expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('supports a browser list proxy and optional language filtering', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => modelResponse,
    } as Response);

    const voices = await getVoiceEngineVoiceList('deepgram', {
      voiceListApiUrl: '/api/deepgram/v2/models',
      language: 'en-GB',
    });

    expect(voices.map((voice) => voice.id)).toEqual(['flux-kit-en']);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/deepgram/v2/models');
    await expect(
      getVoiceEngineVoiceList('deepgram', { language: 'ja' }),
    ).resolves.toEqual([]);
  });

  it('returns an empty list for an absent catalog', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await expect(getVoiceEngineVoiceList('deepgram')).resolves.toEqual([]);
  });

  it('reports voice-list endpoint errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Unavailable',
    } as Response);

    await expect(getVoiceEngineVoiceList('deepgram')).rejects.toThrow(
      'Failed to fetch Deepgram voices: 503 - Unavailable',
    );
  });
});
