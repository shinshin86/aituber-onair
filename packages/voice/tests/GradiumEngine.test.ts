import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GradiumEngine } from '../src/engines/GradiumEngine';

describe('GradiumEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update configuration through setter methods', () => {
    const engine = new GradiumEngine();

    engine.setApiEndpoint('https://example.com/api/post/speech/tts');
    engine.setOutputFormat('opus');
    engine.setTemperature(0.3);
    engine.setVoiceSimilarity(2.5);
    engine.setPaddingBonus(-1);
    engine.setRewriteRules('en');

    expect((engine as any).apiEndpoint).toBe(
      'https://example.com/api/post/speech/tts',
    );
    expect((engine as any).outputFormat).toBe('opus');
    expect((engine as any).temperature).toBe(0.3);
    expect((engine as any).voiceSimilarity).toBe(2.5);
    expect((engine as any).paddingBonus).toBe(-1);
    expect((engine as any).rewriteRules).toBe('en');
  });

  it('should fall back to defaults for invalid configuration values', () => {
    const engine = new GradiumEngine();

    engine.setApiEndpoint('');
    (engine as any).setOutputFormat('invalid');
    engine.setTemperature(Number.NaN);
    engine.setVoiceSimilarity(Number.NaN);
    engine.setPaddingBonus(Number.NaN);
    engine.setRewriteRules('');

    expect((engine as any).apiEndpoint).toBe(
      'https://api.gradium.ai/api/post/speech/tts',
    );
    expect((engine as any).outputFormat).toBe('wav');
    expect((engine as any).temperature).toBeUndefined();
    expect((engine as any).voiceSimilarity).toBeUndefined();
    expect((engine as any).paddingBonus).toBeUndefined();
    expect((engine as any).rewriteRules).toBeUndefined();
  });

  it('should clamp numeric json_config values', () => {
    const engine = new GradiumEngine();

    engine.setTemperature(2);
    engine.setVoiceSimilarity(0);
    engine.setPaddingBonus(8);

    expect((engine as any).temperature).toBe(1.4);
    expect((engine as any).voiceSimilarity).toBe(1);
    expect((engine as any).paddingBonus).toBe(4);
  });

  it('should send a valid Gradium TTS request and return audio bytes', async () => {
    const engine = new GradiumEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setOutputFormat('wav');
      engine.setTemperature(0.3);
      engine.setVoiceSimilarity(2.5);
      engine.setPaddingBonus(-1);
      engine.setRewriteRules('en');

      await engine.fetchAudio(
        { message: 'Hello from Gradium', style: 'neutral' } as any,
        'YTpq7expH9539ERJ',
        'gradium-api-key',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      const requestUrl = new URL(url);
      expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
        'https://api.gradium.ai/api/post/speech/tts',
      );
      expect(
        JSON.parse(requestUrl.searchParams.get('json_config') ?? ''),
      ).toEqual({
        temp: 0.3,
        cfg_coef: 2.5,
        padding_bonus: -1,
        rewrite_rules: 'en',
      });
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        'x-api-key': 'gradium-api-key',
      });
      expect(JSON.parse(init.body)).toEqual({
        text: 'Hello from Gradium',
        voice_id: 'YTpq7expH9539ERJ',
        output_format: 'wav',
        only_audio: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should fetch Gradium voices with readable names', async () => {
    const engine = new GradiumEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          uid: 'YTpq7expH9539ERJ',
          name: 'Emma',
          is_catalog: true,
          is_pro_clone: false,
          language: 'en',
        },
      ],
    });
    globalThis.fetch = fetchMock as any;

    try {
      const voices = await engine.getVoiceList('gradium-api-key');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://api.gradium.ai/api/voices/?include_catalog=true',
      );
      expect(init.headers).toEqual({
        'x-api-key': 'gradium-api-key',
      });
      expect(voices).toEqual([
        {
          uid: 'YTpq7expH9539ERJ',
          name: 'Emma',
          is_catalog: true,
          is_pro_clone: false,
          language: 'en',
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require an API key', async () => {
    const engine = new GradiumEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'YTpq7expH9539ERJ',
      ),
    ).rejects.toThrow('Gradium API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new GradiumEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '',
        'gradium-api-key',
      ),
    ).rejects.toThrow('Gradium voice ID is required');
  });

  it('should reject empty input text', async () => {
    const engine = new GradiumEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'YTpq7expH9539ERJ',
        'gradium-api-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw a useful error when the Gradium API returns a non-ok response', async () => {
    const engine = new GradiumEngine();
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
          'YTpq7expH9539ERJ',
          'gradium-api-key',
        ),
      ).rejects.toThrow('Failed to fetch TTS from Gradium: 400 invalid voice');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new GradiumEngine();
    expect(engine.getTestMessage()).toBe('Gradiumを使用します');
    expect(engine.getTestMessage('custom message')).toBe('custom message');
  });
});
