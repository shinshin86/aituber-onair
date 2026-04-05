import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XaiEngine } from '../src/engines/XaiEngine';

describe('XaiEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update configuration through setter methods', () => {
    const engine = new XaiEngine();

    engine.setLanguage('ja');
    engine.setCodec('wav');
    engine.setSampleRate(44100);
    engine.setBitRate(192000);

    expect((engine as any).language).toBe('ja');
    expect((engine as any).codec).toBe('wav');
    expect((engine as any).sampleRate).toBe(44100);
    expect((engine as any).bitRate).toBe(192000);
  });

  it('should fall back to defaults for invalid configuration values', () => {
    const engine = new XaiEngine();

    (engine as any).setLanguage('');
    (engine as any).setCodec('ogg');
    (engine as any).setSampleRate(12345);
    (engine as any).setBitRate(111111);

    expect((engine as any).language).toBe('auto');
    expect((engine as any).codec).toBe('mp3');
    expect((engine as any).sampleRate).toBe(24000);
    expect((engine as any).bitRate).toBe(128000);
  });

  it('should send a valid xAI TTS request and include mp3 bitrate', async () => {
    const engine = new XaiEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setLanguage('ja');
      engine.setCodec('mp3');
      engine.setSampleRate(44100);
      engine.setBitRate(192000);

      await engine.fetchAudio(
        { message: 'こんにちは、xAI TTSです', style: 'neutral' } as any,
        'EVE',
        'xai-api-key',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.x.ai/v1/tts');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer xai-api-key',
      });
      expect(JSON.parse(init.body)).toEqual({
        text: 'こんにちは、xAI TTSです',
        voice_id: 'EVE',
        language: 'ja',
        output_format: {
          codec: 'mp3',
          sample_rate: 44100,
          bit_rate: 192000,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should omit bitrate for non-mp3 output formats and pass speaker as-is', async () => {
    const engine = new XaiEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setCodec('wav');
      engine.setSampleRate(24000);
      engine.setBitRate(192000);

      await engine.fetchAudio(
        { message: 'WAV output test', style: 'neutral' } as any,
        'unknown-voice',
        'xai-api-key',
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({
        text: 'WAV output test',
        voice_id: 'unknown-voice',
        language: 'auto',
        output_format: {
          codec: 'wav',
          sample_rate: 24000,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require an API key', async () => {
    const engine = new XaiEngine();

    await expect(
      engine.fetchAudio({ message: 'hello', style: 'neutral' } as any, 'eve'),
    ).rejects.toThrow('xAI API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new XaiEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '',
        'xai-api-key',
      ),
    ).rejects.toThrow('xAI TTS voice ID is required');
  });

  it('should reject empty input text', async () => {
    const engine = new XaiEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'eve',
        'xai-api-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw when the xAI API returns a non-ok response', async () => {
    const engine = new XaiEngine();
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
          'eve',
          'xai-api-key',
        ),
      ).rejects.toThrow('Failed to fetch TTS from xAI TTS.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new XaiEngine();
    expect(engine.getTestMessage()).toBe('xAI TTSを使用します');
    expect(engine.getTestMessage('custom message')).toBe('custom message');
  });
});
