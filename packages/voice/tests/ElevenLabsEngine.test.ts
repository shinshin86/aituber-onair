import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ElevenLabsEngine } from '../src/engines/ElevenLabsEngine';

describe('ElevenLabsEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update configuration through setter methods', () => {
    const engine = new ElevenLabsEngine();

    engine.setApiEndpoint('https://example.com/v1/text-to-speech');
    engine.setModel('eleven_flash_v2_5');
    engine.setOutputFormat('mp3_22050_32');
    engine.setLanguageCode('ja');
    engine.setVoiceSettings({
      stability: 0.4,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true,
      speed: 1.1,
    });
    engine.setSeed(123.9);
    engine.setPreviousText('previous');
    engine.setNextText('next');
    engine.setApplyTextNormalization('on');
    engine.setApplyLanguageTextNormalization(true);
    engine.setEnableLogging(false);

    expect((engine as any).apiEndpoint).toBe(
      'https://example.com/v1/text-to-speech',
    );
    expect((engine as any).model).toBe('eleven_flash_v2_5');
    expect((engine as any).outputFormat).toBe('mp3_22050_32');
    expect((engine as any).languageCode).toBe('ja');
    expect((engine as any).voiceSettings).toEqual({
      stability: 0.4,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true,
      speed: 1.1,
    });
    expect((engine as any).seed).toBe(123);
    expect((engine as any).previousText).toBe('previous');
    expect((engine as any).nextText).toBe('next');
    expect((engine as any).applyTextNormalization).toBe('on');
    expect((engine as any).applyLanguageTextNormalization).toBe(true);
    expect((engine as any).enableLogging).toBe(false);
  });

  it('should fall back to defaults for invalid configuration values', () => {
    const engine = new ElevenLabsEngine();

    engine.setApiEndpoint('');
    engine.setModel('');
    engine.setOutputFormat('');
    engine.setLanguageCode('');
    engine.setVoiceSettings({
      stability: Number.NaN,
      similarityBoost: 2,
      style: -1,
      speed: 2,
    });
    engine.setSeed(Number.NaN);
    engine.setPreviousText('');
    engine.setNextText('');
    (engine as any).setApplyTextNormalization('invalid');

    expect((engine as any).apiEndpoint).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech',
    );
    expect((engine as any).model).toBe('eleven_multilingual_v2');
    expect((engine as any).outputFormat).toBe('mp3_44100_128');
    expect((engine as any).languageCode).toBeUndefined();
    expect((engine as any).voiceSettings).toEqual({
      stability: undefined,
      similarityBoost: 1,
      style: 0,
      useSpeakerBoost: undefined,
      speed: 1.2,
    });
    expect((engine as any).seed).toBeUndefined();
    expect((engine as any).previousText).toBeUndefined();
    expect((engine as any).nextText).toBeUndefined();
    expect((engine as any).applyTextNormalization).toBeUndefined();
  });

  it('should send a valid ElevenLabs TTS request', async () => {
    const engine = new ElevenLabsEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setModel('eleven_flash_v2_5');
      engine.setOutputFormat('mp3_22050_32');
      engine.setLanguageCode('ja');
      engine.setStability(0.5);
      engine.setSimilarityBoost(0.75);
      engine.setStyle(0.1);
      engine.setUseSpeakerBoost(true);
      engine.setSpeed(1.05);
      engine.setSeed(123);
      engine.setPreviousText('前の文');
      engine.setNextText('次の文');
      engine.setApplyTextNormalization('auto');
      engine.setApplyLanguageTextNormalization(false);
      engine.setEnableLogging(false);

      await engine.fetchAudio(
        { message: 'こんにちは、ElevenLabsです', style: 'neutral' } as any,
        'JBFqnCBsd6RMkjVDRZzb',
        'eleven-api-key',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_22050_32&enable_logging=false',
      );
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        'xi-api-key': 'eleven-api-key',
      });
      expect(JSON.parse(init.body)).toEqual({
        text: 'こんにちは、ElevenLabsです',
        model_id: 'eleven_flash_v2_5',
        language_code: 'ja',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
          speed: 1.05,
        },
        seed: 123,
        previous_text: '前の文',
        next_text: '次の文',
        apply_text_normalization: 'auto',
        apply_language_text_normalization: false,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require an API key', async () => {
    const engine = new ElevenLabsEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'voice-id',
      ),
    ).rejects.toThrow('ElevenLabs API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new ElevenLabsEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '',
        'eleven-api-key',
      ),
    ).rejects.toThrow('ElevenLabs voice ID is required');
  });

  it('should reject empty input text', async () => {
    const engine = new ElevenLabsEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'voice-id',
        'eleven-api-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw when the ElevenLabs API returns a non-ok response', async () => {
    const engine = new ElevenLabsEngine();
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
          'voice-id',
          'eleven-api-key',
        ),
      ).rejects.toThrow('Failed to fetch TTS from ElevenLabs.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new ElevenLabsEngine();
    expect(engine.getTestMessage()).toBe('ElevenLabsを使用します');
    expect(engine.getTestMessage('custom message')).toBe('custom message');
  });
});
