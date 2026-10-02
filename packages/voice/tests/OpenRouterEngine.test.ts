import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OPENROUTER_TTS_API_URL,
  OpenRouterEngine,
  type OpenRouterTtsModel,
  VoiceEngineError,
  VoiceEngineFactory,
  getVoiceEngineCapabilities,
} from '../src';

const cases = [
  ['microsoft/mai-voice-2.1', 'en-US-Harper:MAI-Voice-2.1'],
  ['microsoft/mai-voice-2.1-flash', 'en-US-Harper:MAI-Voice-2.1-Flash'],
] as const;
const talk = { message: ' Hello there! ', style: 'happy' as const };

function mockAudioResponse() {
  const audio = new Uint8Array([0, 0, 0xff, 0x7f, 0, 0x80]).buffer;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'audio/pcm' }),
    arrayBuffer: async () => audio,
  } as Response);
  return { audio, fetchMock };
}

function createEngine(model: OpenRouterTtsModel = cases[0][0]) {
  const engine = new OpenRouterEngine();
  engine.setModel(model);
  return engine;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OpenRouterEngine', () => {
  it.each(cases)(
    'sends %s with the exact speech contract and wraps documented PCM as playable WAV',
    async (model, voice) => {
      const { audio, fetchMock } = mockAudioResponse();
      const wav = await createEngine(model).fetchAudio(
        talk,
        ` ${voice} `,
        ' key ',
      );
      const header = new DataView(wav);
      expect(String.fromCharCode(...new Uint8Array(wav, 0, 4))).toBe('RIFF');
      expect(String.fromCharCode(...new Uint8Array(wav, 8, 4))).toBe('WAVE');
      expect(header.getUint32(4, true)).toBe(wav.byteLength - 8);
      expect(header.getUint16(20, true)).toBe(1);
      expect(header.getUint16(22, true)).toBe(1);
      expect(header.getUint32(24, true)).toBe(24000);
      expect(header.getUint32(28, true)).toBe(48000);
      expect(header.getUint16(32, true)).toBe(2);
      expect(header.getUint16(34, true)).toBe(16);
      expect(header.getUint32(40, true)).toBe(audio.byteLength);
      expect(new Uint8Array(wav, 44)).toEqual(new Uint8Array(audio));
      expect(header.getInt16(44, true)).toBe(0);
      expect(header.getInt16(46, true)).toBe(32767);
      expect(header.getInt16(48, true)).toBe(-32768);
      expect(fetchMock).toHaveBeenCalledWith(
        OPENROUTER_TTS_API_URL,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: 'Hello there!',
            voice,
            response_format: 'pcm',
          }),
          signal: expect.any(AbortSignal),
        }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(Object.keys(body).sort()).toEqual([
        'input',
        'model',
        'response_format',
        'voice',
      ]);
    },
  );

  it('requires model opt-in and never restores an implicit preview model', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = new OpenRouterEngine();
    await expect(
      engine.fetchAudio(talk, cases[0][1], 'key'),
    ).rejects.toMatchObject({ kind: 'configuration' });
    engine.setModel(cases[0][0]);
    engine.setModel(undefined);
    await expect(engine.fetchAudio(talk, cases[0][1], 'key')).rejects.toThrow(
      'explicitly',
    );
    engine.setModel('openai/tts-1' as OpenRouterTtsModel);
    await expect(engine.fetchAudio(talk, cases[0][1], 'key')).rejects.toThrow(
      'explicitly',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(cases)(
    'rejects voices from the other model for %s',
    async (model, voice) => {
      const { fetchMock } = mockAudioResponse();
      const wrongVoice = cases.find(
        (entry) => entry[1] !== voice,
      )?.[1] as string;
      await expect(
        createEngine(model).fetchAudio(talk, wrongVoice, 'key'),
      ).rejects.toMatchObject({ kind: 'configuration' });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    'en-US-Harper',
    ':MAI-Voice-2.1',
    'en-US-Harper:MAI-Voice-2',
    'en-US-Harper:MAI-Voice-2.1:extra',
  ])('rejects malformed voice %s before requesting', async (voice) => {
    const { fetchMock } = mockAudioResponse();
    await expect(
      createEngine().fetchAudio(talk, voice, 'key'),
    ).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a nonempty key and text', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = createEngine();
    await expect(engine.fetchAudio(talk, cases[0][1], ' ')).rejects.toThrow(
      'API key is required',
    );
    await expect(
      engine.fetchAudio({ ...talk, message: ' ' }, cases[0][1], 'key'),
    ).rejects.toThrow('Input text is empty');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports an absolute custom endpoint without browser globals and resets it', async () => {
    const { fetchMock } = mockAudioResponse();
    vi.stubGlobal('location', undefined);
    const engine = createEngine();
    engine.setApiEndpoint(' https://tts.example.test/speech?route=custom ');
    await engine.fetchAudio(talk, cases[0][1], 'key');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://tts.example.test/speech?route=custom',
    );
    engine.setApiEndpoint(' ');
    await engine.fetchAudio(talk, cases[0][1], 'key');
    expect(fetchMock.mock.calls[1][0]).toBe(OPENROUTER_TTS_API_URL);
  });

  it('resolves a same-origin browser endpoint', async () => {
    const { fetchMock } = mockAudioResponse();
    const engine = createEngine();
    engine.setApiEndpoint('/api/openrouter/speech');
    await engine.fetchAudio(talk, cases[0][1], 'key');
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${location.origin}/api/openrouter/speech`,
    );
  });

  it.each([
    'https://[invalid',
    '/api/speech',
    'file:///tmp/speech',
    'data:audio/mpeg;base64,AAAA',
  ])('rejects invalid Node URL %s before sending', async (endpoint) => {
    const { fetchMock } = mockAudioResponse();
    vi.stubGlobal('location', undefined);
    const engine = createEngine();
    engine.setApiEndpoint(endpoint);
    await expect(
      engine.fetchAudio(talk, cases[0][1], 'key'),
    ).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401, 402, 429, 503])(
    'preserves API error status %s and details',
    async (status) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status,
        text: async () => '{"error":{"message":"request rejected"}}',
      } as Response);
      await expect(
        createEngine().fetchAudio(talk, cases[0][1], 'key'),
      ).rejects.toMatchObject({
        kind: 'api',
        statusCode: status,
        message: expect.stringContaining('request rejected'),
      });
    },
  );

  it.each(['application/json', 'text/html', 'audio/mpeg', ''])(
    'rejects non-PCM %s before playback',
    async (type) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': type }),
      } as Response);
      await expect(
        createEngine().fetchAudio(talk, cases[0][1], 'key'),
      ).rejects.toThrow('non-PCM response');
    },
  );

  it('rejects empty audio', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/pcm; charset=binary' }),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    await expect(
      createEngine().fetchAudio(talk, cases[0][1], 'key'),
    ).rejects.toThrow('empty audio');
  });

  it('rejects a truncated 16-bit PCM sample before WAV wrapping', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/pcm' }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response);
    await expect(
      createEngine().fetchAudio(talk, cases[0][1], 'key'),
    ).rejects.toMatchObject({
      kind: 'api',
      message: 'OpenRouter returned incomplete PCM samples',
    });
  });

  it('reports network failures through VoiceEngineError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    const result = createEngine().fetchAudio(talk, cases[0][1], 'key');
    await expect(result).rejects.toBeInstanceOf(VoiceEngineError);
    await expect(result).rejects.toMatchObject({ kind: 'network' });
  });

  it('registers the engine and only documented capabilities', () => {
    expect(VoiceEngineFactory.getEngine('openRouter')).toBeInstanceOf(
      OpenRouterEngine,
    );
    expect(getVoiceEngineCapabilities('openRouter')).toEqual({
      engineType: 'openRouter',
      requiresApiKey: true,
      supportsCustomEndpoint: true,
      supportsVoiceList: true,
      supportsEmotion: false,
      runtimes: ['browser', 'node', 'server'],
    });
    expect(createEngine().getTestMessage()).toContain('Hello');
    expect(createEngine().getTestMessage('Custom text')).toBe('Custom text');
  });
});
