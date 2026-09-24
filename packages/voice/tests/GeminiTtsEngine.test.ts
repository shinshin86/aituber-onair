import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiTtsEngine } from '../src/engines/GeminiTtsEngine';

function createAudioResponse(audioText = 'fake-audio') {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: btoa(audioText),
                },
              },
            ],
          },
        },
      ],
    }),
  };
}

function createInteractionAudioResponse(audioBytes: Uint8Array) {
  return {
    ok: true,
    json: async () => ({
      steps: [
        { type: 'user_input', content: [{ type: 'text', text: 'hello' }] },
        {
          type: 'model_output',
          content: [
            {
              type: 'audio',
              mime_type: 'audio/wav',
              data: btoa(String.fromCharCode(...audioBytes)),
            },
          ],
        },
      ],
    }),
  };
}

describe('GeminiTtsEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should update configuration through setter methods', () => {
    const engine = new GeminiTtsEngine();

    engine.setApiEndpoint('https://example.googleapis.com/v1beta/');
    engine.setModel('gemini-3.1-flash-tts-preview');
    engine.setLanguageCode('en-US');
    engine.setPrompt('Speak cheerfully');

    expect((engine as any).baseUrl).toBe(
      'https://example.googleapis.com/v1beta',
    );
    expect((engine as any).model).toBe('gemini-3.1-flash-tts-preview');
    expect((engine as any).languageCode).toBe('en-US');
    expect((engine as any).prompt).toBe('Speak cheerfully');
  });

  it('should fall back to defaults for empty configuration values', () => {
    const engine = new GeminiTtsEngine();

    engine.setApiEndpoint('');
    engine.setModel('');
    engine.setLanguageCode('');
    engine.setPrompt('');

    expect((engine as any).baseUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
    expect((engine as any).model).toBe('gemini-3.1-flash-tts-preview');
    expect((engine as any).languageCode).toBe('ja-JP');
    expect((engine as any).prompt).toBeUndefined();
  });

  it('should send a valid Gemini API request with API key auth', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi.fn().mockResolvedValue(createAudioResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    const audio = await engine.fetchAudio(
      { message: 'Gemini TTS test', style: 'neutral' } as any,
      'Zephyr',
      'test-api-key',
    );

    expect(audio.byteLength).toBe(44 + 'fake-audio'.length);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent',
    );
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-goog-api-key': 'test-api-key',
    });
    expect(JSON.parse(init.body)).toEqual({
      contents: [
        {
          parts: [
            {
              text: 'Gemini TTS test',
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: 'ja-JP',
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            },
          },
        },
      },
    });
  });

  it('should wrap PCM response in WAV container', async () => {
    const engine = new GeminiTtsEngine();
    const pcmBytes = Uint8Array.from([0x01, 0x02, 0x03, 0x04]);
    const base64Pcm = btoa(String.fromCharCode(...pcmBytes));

    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: base64Pcm,
                    },
                  },
                ],
              },
            },
          ],
        }),
      }) as typeof fetch;

      const audio = await engine.fetchAudio(
        { message: 'Gemini PCM test', style: 'neutral' } as any,
        'Zephyr',
        'test-api-key',
      );

      expect(audio.byteLength).toBe(48);

      const view = new DataView(audio);
      const bytes = new Uint8Array(audio);
      const decodeChunk = (offset: number) =>
        String.fromCharCode(...bytes.slice(offset, offset + 4));

      expect(decodeChunk(0)).toBe('RIFF');
      expect(view.getUint32(4, true)).toBe(40);
      expect(decodeChunk(8)).toBe('WAVE');
      expect(decodeChunk(12)).toBe('fmt ');
      expect(view.getUint32(16, true)).toBe(16);
      expect(view.getUint16(20, true)).toBe(1);
      expect(view.getUint16(22, true)).toBe(1);
      expect(view.getUint32(24, true)).toBe(24000);
      expect(decodeChunk(36)).toBe('data');
      expect(view.getUint32(40, true)).toBe(4);
      expect(Array.from(bytes.slice(44))).toEqual([0x01, 0x02, 0x03, 0x04]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.each(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'] as const)(
    'should use the Interactions API and return WAV bytes for %s',
    async (model) => {
      const engine = new GeminiTtsEngine();
      const wavBytes = Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
      ]);
      const fetchMock = vi
        .fn()
        .mockResolvedValue(createInteractionAudioResponse(wavBytes));
      globalThis.fetch = fetchMock as typeof fetch;

      engine.setModel(model);
      engine.setPrompt('cheerful and friendly');
      engine.setLanguageCode('ja-JP');

      const audio = await engine.fetchAudio(
        { message: 'こんにちは', style: 'neutral' },
        'Kore',
        'test-api-key',
      );

      expect(Array.from(new Uint8Array(audio))).toEqual(Array.from(wavBytes));
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
      );
      expect(init.headers['x-goog-api-key']).toBe('test-api-key');
      expect(JSON.parse(init.body)).toEqual({
        model,
        input: [
          {
            type: 'user_input',
            content: [
              {
                type: 'text',
                text: 'こんにちは',
                annotations: [
                  { type: 'speech_metadata', style: 'cheerful and friendly' },
                ],
              },
            ],
          },
        ],
        response_format: { type: 'audio', mime_type: 'audio/wav' },
        generation_config: { speech_config: [{ voice: 'Kore' }] },
      });
    },
  );

  it('should omit speech metadata when no style is configured', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createInteractionAudioResponse(Uint8Array.of(1)));
    globalThis.fetch = fetchMock as typeof fetch;
    engine.setModel('gemini-3.8-flash-lite-tts');

    await engine.fetchAudio(
      { message: 'Hello', style: 'neutral' },
      'voice_custom',
      'test-api-key',
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).input[0].content[0]).toEqual({
      type: 'text',
      text: 'Hello',
    });
    expect(JSON.parse(init.body).generation_config.speech_config).toEqual([
      { voice: 'voice_custom' },
    ]);
  });

  it('should reject an Interactions response without audio', async () => {
    const engine = new GeminiTtsEngine();
    engine.setModel('gemini-3.8-flash-tts');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: [
          { type: 'model_output', content: [{ type: 'text', text: '' }] },
        ],
      }),
    }) as typeof fetch;

    await expect(
      engine.fetchAudio(
        { message: 'Hello', style: 'neutral' },
        'Kore',
        'test-api-key',
      ),
    ).rejects.toThrow('No audio content in Gemini TTS response.');
  });

  it('should prepend prompt text to the request content', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi.fn().mockResolvedValue(createAudioResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    engine.setPrompt('Speak cheerfully');
    engine.setModel('gemini-2.5-pro-preview-tts');
    engine.setLanguageCode('en-US');

    await engine.fetchAudio(
      { message: 'Prompted speech', style: 'neutral' } as any,
      'Zephyr',
      'test-api-key',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent',
    );
    expect(JSON.parse(init.body)).toEqual({
      contents: [
        {
          parts: [
            {
              text: 'Speak cheerfully\nPrompted speech',
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: 'en-US',
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            },
          },
        },
      },
    });
  });

  it('should use a custom API endpoint when configured', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi.fn().mockResolvedValue(createAudioResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    engine.setApiEndpoint('https://example.googleapis.com/custom/');

    await engine.fetchAudio(
      { message: 'Custom endpoint test', style: 'neutral' } as any,
      'Zephyr',
      'test-api-key',
    );

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://example.googleapis.com/custom/models/gemini-3.1-flash-tts-preview:generateContent',
    );
  });

  it('should require an API key', async () => {
    const engine = new GeminiTtsEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'Zephyr',
      ),
    ).rejects.toThrow('Gemini TTS API key is required');
  });

  it('should require a speaker', async () => {
    const engine = new GeminiTtsEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        '   ',
        'test-api-key',
      ),
    ).rejects.toThrow('Gemini TTS voice name is required');
  });

  it('should reject empty input text', async () => {
    const engine = new GeminiTtsEngine();

    await expect(
      engine.fetchAudio(
        { message: '   ', style: 'neutral' } as any,
        'Zephyr',
        'test-api-key',
      ),
    ).rejects.toThrow('Input text is empty');
  });

  it('should throw when the Gemini API returns a non-ok response', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'Zephyr',
        'test-api-key',
      ),
    ).rejects.toThrow('Failed to fetch TTS from Gemini TTS.');
  });

  it('should throw when the response has no audio content', async () => {
    const engine = new GeminiTtsEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'no audio' }],
            },
          },
        ],
      }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' } as any,
        'Zephyr',
        'test-api-key',
      ),
    ).rejects.toThrow('No audio content in Gemini TTS response.');
  });

  it('should return a provider-specific test message', () => {
    const engine = new GeminiTtsEngine();

    expect(engine.getTestMessage()).toBe('Gemini TTSを使用します');
    expect(engine.getTestMessage('custom')).toBe('custom');
  });
});
