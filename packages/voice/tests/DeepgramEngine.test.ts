import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEEPGRAM_DEFAULT_VOICE,
  DEEPGRAM_TTS_API_URL,
  DeepgramEngine,
  VoiceEngineError,
} from '../src';

const talk = { message: ' Hello there! ', style: 'happy' as const };

function mockAudioResponse() {
  const audio = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]).buffer;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'audio/mpeg' }),
    arrayBuffer: async () => audio,
  } as Response);
  return { audio, fetchMock };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DeepgramEngine', () => {
  it('sends the Flux batch contract and returns binary MP3 unchanged', async () => {
    const { audio, fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();

    expect(
      await engine.fetchAudio(talk, ` ${DEEPGRAM_DEFAULT_VOICE} `, ' key '),
    ).toBe(audio);

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEEPGRAM_TTS_API_URL}?model=flux-haley-en&encoding=mp3`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Token key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Hello there!' }),
        signal: expect.any(AbortSignal),
      }),
    );
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.has('speed')).toBe(false);
    expect(url.searchParams.has('expressivity')).toBe(false);
    expect(url.searchParams.has('callback')).toBe(false);
  });

  it('works without browser globals and supports custom endpoints', async () => {
    const { fetchMock } = mockAudioResponse();
    vi.stubGlobal('location', undefined);
    const engine = new DeepgramEngine();
    engine.setApiEndpoint(' https://tts.example.test/flux?tag=demo ');

    await engine.fetchAudio(talk, 'flux-kit-en', 'key');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://tts.example.test/flux',
    );
    expect(url.searchParams.get('tag')).toBe('demo');
    expect(url.searchParams.get('model')).toBe('flux-kit-en');
  });

  it('resolves a same-origin browser proxy', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();
    engine.setApiEndpoint('/api/deepgram/v2/speak');

    await engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin).toBe(globalThis.location.origin);
    expect(url.pathname).toBe('/api/deepgram/v2/speak');
  });

  it.each(['/api/deepgram/v2/speak', 'https://[invalid'])(
    'reports invalid Node endpoint %s as a configuration error',
    async (endpoint) => {
      const { fetchMock } = mockAudioResponse();
      vi.stubGlobal('location', undefined);
      const engine = new DeepgramEngine();
      engine.setApiEndpoint(endpoint);

      const result = engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key');
      await expect(result).rejects.toBeInstanceOf(VoiceEngineError);
      await expect(result).rejects.toMatchObject({
        kind: 'configuration',
        message: expect.stringContaining('absolute URL'),
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(['file:///tmp/speech', 'data:audio/mpeg;base64,AAAA'])(
    'rejects unsupported endpoint protocol %s before requesting',
    async (endpoint) => {
      const { fetchMock } = mockAudioResponse();
      const engine = new DeepgramEngine();
      engine.setApiEndpoint(endpoint);

      await expect(
        engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key'),
      ).rejects.toMatchObject({
        name: 'VoiceEngineError',
        kind: 'configuration',
        message: 'Deepgram API URL must use HTTP or HTTPS',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    [0, '0.5'],
    [0.51, '0.5'],
    [0.53, '0.55'],
    [1.07, '1.05'],
    [1.1, '1.1'],
    [5, '1.5'],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ])('normalizes speed %s to %s', async (speed, expected) => {
    const { fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();
    engine.setSpeed(speed);

    await engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('speed')).toBe(expected);
  });

  it('resets endpoint and speed to defaults', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();
    engine.setApiEndpoint('https://proxy.example.test/speak');
    engine.setSpeed(1.25);
    engine.setApiEndpoint(' ');
    engine.setSpeed(undefined);

    await engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key');

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${DEEPGRAM_TTS_API_URL}?model=flux-haley-en&encoding=mp3`,
    );
  });

  it.each(['', 'aura-2-thalia-en', 'flux-haley-ja', 'haley'])(
    'rejects unsupported voice %s before requesting',
    async (speaker) => {
      const { fetchMock } = mockAudioResponse();
      await expect(
        new DeepgramEngine().fetchAudio(talk, speaker, 'key'),
      ).rejects.toMatchObject({ kind: 'configuration' });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('requires a key and nonempty text before requesting', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();

    await expect(
      engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, ' '),
    ).rejects.toThrow('Deepgram API key is required');
    await expect(
      engine.fetchAudio(
        { ...talk, message: ' ' },
        DEEPGRAM_DEFAULT_VOICE,
        'key',
      ),
    ).rejects.toThrow('Input text is empty');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects asynchronous callback configuration', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = new DeepgramEngine();
    engine.setApiEndpoint(
      `${DEEPGRAM_TTS_API_URL}?callback=https://example.test`,
    );

    await expect(
      engine.fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key'),
    ).rejects.toThrow(
      'Deepgram callback requests cannot be used for audio playback',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports API errors with response details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'RATE_LIMIT_EXCEEDED',
    } as Response);

    await expect(
      new DeepgramEngine().fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key'),
    ).rejects.toMatchObject({
      kind: 'api',
      statusCode: 429,
      message: 'Failed to fetch TTS from Deepgram: 429 - RATE_LIMIT_EXCEEDED',
    });
  });

  it('does not pass JSON acknowledgements to the audio player', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/json; charset=utf-8',
      }),
    } as Response);

    await expect(
      new DeepgramEngine().fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key'),
    ).rejects.toThrow('Deepgram returned JSON instead of audio');
  });

  it('rejects an empty audio response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);

    await expect(
      new DeepgramEngine().fetchAudio(talk, DEEPGRAM_DEFAULT_VOICE, 'key'),
    ).rejects.toThrow('Deepgram returned empty audio');
  });

  it('provides an English test message for the English-only route', () => {
    const engine = new DeepgramEngine();
    expect(engine.getTestMessage()).toBe(
      'Hello! This is Deepgram Flux text to speech.',
    );
    expect(engine.getTestMessage('Custom preview')).toBe('Custom preview');
  });
});
