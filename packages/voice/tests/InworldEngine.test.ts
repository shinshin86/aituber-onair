import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InworldEngine } from '../src/engines/InworldEngine';

describe('InworldEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update configuration through setter methods', () => {
    const engine = new InworldEngine();

    engine.setApiEndpoint('https://example.com/tts/v1/voice');
    engine.setModel('inworld-tts-1.5-mini');
    engine.setAudioEncoding('LINEAR16');
    engine.setSampleRateHertz(24000);
    engine.setBitRate(128000);
    engine.setSpeakingRate(1.1);
    engine.setLanguage('ja-JP');
    engine.setDeliveryMode('BALANCED');
    engine.setTemperature(0.8);

    expect((engine as any).apiEndpoint).toBe(
      'https://example.com/tts/v1/voice',
    );
    expect((engine as any).model).toBe('inworld-tts-1.5-mini');
    expect((engine as any).audioEncoding).toBe('LINEAR16');
    expect((engine as any).sampleRateHertz).toBe(24000);
    expect((engine as any).bitRate).toBe(128000);
    expect((engine as any).speakingRate).toBe(1.1);
    expect((engine as any).language).toBe('ja-JP');
    expect((engine as any).deliveryMode).toBe('BALANCED');
    expect((engine as any).temperature).toBe(0.8);
  });

  it('should fall back to defaults for invalid configuration values', () => {
    const engine = new InworldEngine();

    engine.setApiEndpoint('');
    engine.setModel('');
    (engine as any).setAudioEncoding('INVALID');
    engine.setSampleRateHertz(Number.NaN);
    engine.setBitRate(Number.NaN);
    engine.setSpeakingRate(Number.NaN);
    engine.setLanguage('');
    (engine as any).setDeliveryMode('INVALID');
    engine.setTemperature(Number.NaN);

    expect((engine as any).apiEndpoint).toBe(
      'https://api.inworld.ai/tts/v1/voice',
    );
    expect((engine as any).model).toBe('inworld-tts-2');
    expect((engine as any).audioEncoding).toBe('MP3');
    expect((engine as any).sampleRateHertz).toBe(48000);
    expect((engine as any).bitRate).toBeUndefined();
    expect((engine as any).speakingRate).toBeUndefined();
    expect((engine as any).language).toBeUndefined();
    expect((engine as any).deliveryMode).toBeUndefined();
    expect((engine as any).temperature).toBeUndefined();
  });

  it('should send a valid Inworld TTS request and return audio bytes', async () => {
    const engine = new InworldEngine();
    const audioBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audioContent: btoa(String.fromCharCode(...audioBytes)),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setModel('inworld-tts-2');
      engine.setAudioEncoding('MP3');
      engine.setSampleRateHertz(48000);
      engine.setBitRate(128000);
      engine.setSpeakingRate(1.05);
      engine.setLanguage('ja-JP');
      engine.setDeliveryMode('STABLE');
      engine.setTemperature(0.9);

      const result = await engine.fetchAudio(
        { message: 'こんにちは、Inworldです', style: 'neutral' } as any,
        'Ashley',
        'inworld-basic-key',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.inworld.ai/tts/v1/voice');
      expect(init.headers).toEqual({
        Authorization: 'Basic inworld-basic-key',
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(init.body)).toEqual({
        text: 'こんにちは、Inworldです',
        voiceId: 'Ashley',
        modelId: 'inworld-tts-2',
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: 48000,
          bitRate: 128000,
        },
        speakingRate: 1.05,
        language: 'ja-JP',
        deliveryMode: 'STABLE',
        temperature: 0.9,
      });
      expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3, 4]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should apply defaults in the request body', async () => {
    const engine = new InworldEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audioContent: btoa('audio'),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      await engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'Ashley',
        'inworld-basic-key',
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({
        text: 'hello',
        voiceId: 'Ashley',
        modelId: 'inworld-tts-2',
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: 48000,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require an API key', async () => {
    const engine = new InworldEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'Ashley',
      ),
    ).rejects.toThrow('Inworld API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new InworldEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '',
        'inworld-basic-key',
      ),
    ).rejects.toThrow('Inworld voice ID is required');
  });

  it('should reject empty input text', async () => {
    const engine = new InworldEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'Ashley',
        'inworld-basic-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw a useful error when the Inworld API returns a non-ok response', async () => {
    const engine = new InworldEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'invalid voice',
    });
    globalThis.fetch = fetchMock as any;

    try {
      await expect(
        engine.fetchAudio(
          { message: 'hello', style: 'neutral' } as any,
          'Ashley',
          'inworld-basic-key',
        ),
      ).rejects.toThrow('Failed to fetch TTS from Inworld: 400 invalid voice');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw when audioContent is missing', async () => {
    const engine = new InworldEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as any;

    try {
      await expect(
        engine.fetchAudio(
          { message: 'hello', style: 'neutral' } as any,
          'Ashley',
          'inworld-basic-key',
        ),
      ).rejects.toThrow(
        'Failed to fetch TTS from Inworld: missing audioContent',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new InworldEngine();
    expect(engine.getTestMessage()).toBe('Inworldを使用します');
    expect(engine.getTestMessage('custom message')).toBe('custom message');
  });
});
