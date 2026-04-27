import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnrealSpeechEngine } from '../src/engines/UnrealSpeechEngine';

describe('UnrealSpeechEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update configuration through setter methods', () => {
    const engine = new UnrealSpeechEngine();

    engine.setApiEndpoint('https://example.com/stream');
    engine.setBitrate('320k');
    engine.setSpeed(0.5);
    engine.setPitch(1.2);
    engine.setCodec('pcm_s16le');
    engine.setTemperature(0.4);

    expect((engine as any).apiEndpoint).toBe('https://example.com/stream');
    expect((engine as any).bitrate).toBe('320k');
    expect((engine as any).speed).toBe(0.5);
    expect((engine as any).pitch).toBe(1.2);
    expect((engine as any).codec).toBe('pcm_s16le');
    expect((engine as any).temperature).toBe(0.4);
  });

  it('should fall back to defaults for invalid configuration values', () => {
    const engine = new UnrealSpeechEngine();

    engine.setApiEndpoint('');
    engine.setBitrate('');
    engine.setSpeed(Number.NaN);
    engine.setPitch(Number.NaN);
    (engine as any).setCodec('ogg');
    engine.setTemperature(Number.NaN);

    expect((engine as any).apiEndpoint).toBe(
      'https://api.v8.unrealspeech.com/stream',
    );
    expect((engine as any).bitrate).toBe('192k');
    expect((engine as any).speed).toBe(0);
    expect((engine as any).pitch).toBe(1);
    expect((engine as any).codec).toBe('libmp3lame');
    expect((engine as any).temperature).toBeUndefined();
  });

  it('should clamp numeric configuration values', () => {
    const engine = new UnrealSpeechEngine();

    engine.setSpeed(2);
    engine.setPitch(2);
    engine.setTemperature(2);

    expect((engine as any).speed).toBe(1);
    expect((engine as any).pitch).toBe(1.5);
    expect((engine as any).temperature).toBe(0.8);

    engine.setSpeed(-2);
    engine.setPitch(0);
    engine.setTemperature(0);

    expect((engine as any).speed).toBe(-1);
    expect((engine as any).pitch).toBe(0.5);
    expect((engine as any).temperature).toBe(0.1);
  });

  it('should send a valid Unreal Speech stream request', async () => {
    const engine = new UnrealSpeechEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setBitrate('320k');
      engine.setSpeed(0.2);
      engine.setPitch(1.1);
      engine.setCodec('pcm_mulaw');
      engine.setTemperature(0.3);

      await engine.fetchAudio(
        { message: 'こんにちは、Unreal Speechです', style: 'neutral' } as any,
        'af_bella',
        'unreal-api-key',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.v8.unrealspeech.com/stream');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer unreal-api-key',
      });
      expect(JSON.parse(init.body)).toEqual({
        Text: 'こんにちは、Unreal Speechです',
        VoiceId: 'af_bella',
        Bitrate: '320k',
        Speed: '0.2',
        Pitch: '1.1',
        Codec: 'pcm_mulaw',
        Temperature: 0.3,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require an API key', async () => {
    const engine = new UnrealSpeechEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'af_bella',
      ),
    ).rejects.toThrow('Unreal Speech API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new UnrealSpeechEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '',
        'unreal-api-key',
      ),
    ).rejects.toThrow('Unreal Speech voice ID is required');
  });

  it('should reject empty input text', async () => {
    const engine = new UnrealSpeechEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'af_bella',
        'unreal-api-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw when the Unreal Speech API returns a non-ok response', async () => {
    const engine = new UnrealSpeechEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });
    globalThis.fetch = fetchMock as any;

    try {
      await expect(
        engine.fetchAudio(
          { message: 'hello', style: 'neutral' } as any,
          'af_bella',
          'unreal-api-key',
        ),
      ).rejects.toThrow('Failed to fetch TTS from Unreal Speech.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new UnrealSpeechEngine();
    expect(engine.getTestMessage()).toBe('Unreal Speechを使用します');
    expect(engine.getTestMessage('custom message')).toBe('custom message');
  });
});
