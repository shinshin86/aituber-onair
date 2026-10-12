import type { Mock } from 'vitest';
import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
  resolveOpenAICompatibleTranscriptionEndpoint,
} from '../src';
import type {
  OpenAICompatibleTranscriptionOptions,
  TranscriptUpdate,
  TranscriptionError,
} from '../src';
import { OpenAICompatibleTranscriptionSession } from '../src/providers/OpenAICompatibleTranscriptionSession';
import { encodeTranscriptionWav } from '../src/providers/openaiCompatibleTranscription';
import type { BrowserPcmTurnCaptureOptions } from '../src/providers/BrowserPcmTurnCapture';
import type { CapturedAudioTurn } from '../src/providers/PcmTurnAssembler';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const turn = (duration = 300, sampleRate = 48000): CapturedAudioTurn => ({
  audio: new Float32Array(sampleRate / 2).fill(0.25),
  sampleRate,
  confirmedSpeechDurationMs: duration,
});

let captureOptions: BrowserPcmTurnCaptureOptions;
let stopCapture: Mock<[], Promise<void>>;
let getUserMedia: Mock<[], Promise<MediaStream>>;
let stopTrack: Mock<[], void>;
let request = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
let sessions: OpenAICompatibleTranscriptionSession[];
function session(options: Partial<OpenAICompatibleTranscriptionOptions> = {}) {
  const result = new OpenAICompatibleTranscriptionSession(
    {
      provider: 'openai-compatible',
      baseUrl: 'http://localhost:8080',
      ...options,
    },
    {
      fetch: request,
      createCapture: (_stream, options) => {
        captureOptions = options;
        return { start: async () => {}, stop: stopCapture };
      },
    }
  );
  sessions.push(result);
  return result;
}
function formKeys(form: FormData): string[] {
  const keys: string[] = [];
  form.forEach((_, key) => keys.push(key));
  return keys;
}

function emit(duration = 300) {
  captureOptions.onTurn(turn(duration));
}

beforeEach(() => {
  sessions = [];
  stopTrack = vi.fn();
  stopCapture = vi.fn(async () => {
    stopTrack();
  });
  getUserMedia = vi.fn<[], Promise<MediaStream>>(
    async () =>
      ({
        getTracks: () => [{ stop: stopTrack } as unknown as MediaStreamTrack],
      }) as MediaStream
  );
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });
  vi.stubGlobal('AudioContext', class {});
  vi.stubGlobal('AudioWorkletNode', class {});
  vi.stubGlobal('Worker', undefined);
  request = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(
    async () => json({ text: 'transcribed' })
  );
});
afterEach(async () => {
  await Promise.all(sessions.map((s) => s.dispose()));
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'mediaDevices');
  Reflect.deleteProperty(window, 'isSecureContext');
});

describe('OpenAI-compatible URL and WAV', () => {
  it.each([
    ['http://localhost:8080', 'http://localhost:8080/v1/audio/transcriptions'],
    ['http://localhost:8080/', 'http://localhost:8080/v1/audio/transcriptions'],
    ['https://example.com/v1/', 'https://example.com/v1/audio/transcriptions'],
    [
      'https://example.com/v1/audio/transcriptions/',
      'https://example.com/v1/audio/transcriptions',
    ],
    [
      'https://example.com/proxy/v1/',
      'https://example.com/proxy/v1/audio/transcriptions',
    ],
    [
      'https://example.com/custom',
      'https://example.com/custom/audio/transcriptions',
    ],
  ])('resolves %s', (input, expected) => {
    expect(resolveOpenAICompatibleTranscriptionEndpoint(input)).toBe(expected);
  });
  it.each([
    '',
    '/v1',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com/?key=x',
    'https://example.com/#x',
  ])('rejects %s', (baseUrl) => {
    expect(() => session({ baseUrl })).toThrowError(
      expect.objectContaining({ code: 'invalid-configuration' })
    );
  });
  it('writes a valid mono PCM16 16 kHz header and clamps samples', () => {
    const buffer = encodeTranscriptionWav(new Float32Array([-2, -1, 0, 1, 2]));
    const view = new DataView(buffer);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(buffer, offset, length));
    expect(buffer.byteLength).toBe(54);
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 8)).toBe('WAVEfmt ');
    expect(text(36, 4)).toBe('data');
    expect(view.getUint32(4, true)).toBe(46);
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(10);
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))).toEqual(
      [-32768, -32768, 0, 32767, 32767]
    );
  });
});

describe('OpenAICompatibleTranscriptionSession', () => {
  it('is available without WebGPU or workers and exposes final-only capabilities', async () => {
    expect(isTranscriptionProviderSupported('openai-compatible')).toBe(true);
    const publicSession = createRealtimeTranscriptionSession({
      provider: 'openai-compatible',
      baseUrl: 'http://localhost:8080',
    });
    expect(publicSession).toBeInstanceOf(OpenAICompatibleTranscriptionSession);
    expect(publicSession.capabilities).toEqual({
      interimResults: false,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: false,
    });
    await publicSession.dispose();
    const s = session();
    await s.start();
    expect(captureOptions.silenceDurationMs).toBe(500);
    expect(s.state).toBe('listening');
  });
  it.each(['AudioContext', 'AudioWorkletNode', 'fetch', 'FormData'])(
    'requires %s',
    async (name) => {
      vi.stubGlobal(name, undefined);
      expect(isTranscriptionProviderSupported('openai-compatible')).toBe(false);
      await expect(session().start()).rejects.toMatchObject({
        code: 'unsupported-provider',
      });
    }
  );
  it('rejects insecure contexts and microphone denial', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    await expect(session().start()).rejects.toMatchObject({
      code: 'insecure-context',
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    getUserMedia.mockRejectedValueOnce(
      new DOMException('denied', 'NotAllowedError')
    );
    await expect(session().start()).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
  it.each([
    { silenceDurationMs: 149 },
    { silenceDurationMs: Number.NaN },
    { timeoutMs: 0 },
    { timeoutMs: Number.POSITIVE_INFINITY },
    { timeoutMs: 2147483648 },
  ])('rejects invalid options %j', (options) => {
    expect(() => session(options)).toThrowError(
      expect.objectContaining({ code: 'invalid-configuration' })
    );
  });
  it('sends strict multipart fields, optional bearer auth, and resampled WAV', async () => {
    const getApiKey = vi.fn(async () => ' test-key ');
    const s = session({
      model: ' qwen3-asr-0.6b ',
      language: ' JA_jP ',
      prompt: ' names ',
      auth: {
        type: 'browser-api-key',
        getApiKey,
        acknowledgeBrowserKeyRisk: true,
      },
    });
    const updates: TranscriptUpdate[] = [];
    s.onTranscript((value) => updates.push(value));
    request.mockResolvedValueOnce(json({ text: ' 結果 ' }));
    await s.start();
    emit();
    await s.stop();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('http://localhost:8080/v1/audio/transcriptions');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      headers: { Authorization: 'Bearer test-key' },
    });
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
    const form = init?.body as FormData;
    expect(formKeys(form).sort()).toEqual([
      'file',
      'language',
      'model',
      'prompt',
      'response_format',
    ]);
    expect(form.get('model')).toBe('qwen3-asr-0.6b');
    expect(form.get('language')).toBe('ja');
    expect(form.get('prompt')).toBe('names');
    expect(form.get('response_format')).toBe('json');
    const file = form.get('file') as File;
    expect(file.name).toBe('utterance.wav');
    expect(file.type).toBe('audio/wav');
    expect(file.size).toBe(44 + 8000 * 2);
    expect(updates).toEqual([
      { utteranceId: 'openai-compatible:1', text: '結果', isFinal: true },
    ]);
    expect(getApiKey).toHaveBeenCalledOnce();
  });
  it('omits blank options and auth entirely', async () => {
    const s = session({ model: ' ', prompt: '\n', language: ' ' });
    await s.start();
    emit();
    await s.stop();
    const init = request.mock.calls[0][1];
    expect(formKeys(init?.body as FormData)).toEqual([
      'file',
      'response_format',
    ]);
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });
  it('drops short audio, empty output and hallucinations', async () => {
    request
      .mockResolvedValueOnce(json({ text: ' ' }))
      .mockResolvedValueOnce(json({ text: 'ご視聴ありがとうございました！！' }))
      .mockResolvedValueOnce(json({ text: 'actual words' }));
    const s = session();
    const updates = vi.fn();
    s.onTranscript(updates);
    await s.start();
    emit(299);
    emit();
    emit();
    emit();
    await s.stop();
    expect(request).toHaveBeenCalledTimes(3);
    expect(updates).toHaveBeenCalledOnce();
    expect(updates).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'actual words' })
    );
  });
  it('serializes turns and flushes capture before stop completes', async () => {
    const first = deferred<Response>();
    request
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(json({ text: 'second' }));
    const s = session();
    const updates: string[] = [];
    s.onTranscript((u) => updates.push(u.text));
    await s.start();
    emit();
    stopCapture.mockImplementationOnce(async () => {
      emit();
      stopTrack();
    });
    const stopped = s.stop();
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(s.state).toBe('stopping');
    first.resolve(json({ text: 'first' }));
    await stopped;
    expect(updates).toEqual(['first', 'second']);
    expect(s.state).toBe('idle');
    expect(stopTrack).toHaveBeenCalledOnce();
    await s.start();
    expect(s.state).toBe('listening');
  });
  it.each([401, 403, 400, 503])(
    'maps HTTP %s and stops only on auth failure',
    async (status) => {
      request.mockResolvedValueOnce(
        json(
          {
            error: {
              code: status === 403 ? 'origin_not_allowed' : 'failure',
              message: 'server detail',
            },
          },
          status
        )
      );
      const s = session();
      const errors: TranscriptionError[] = [];
      s.onError((e) => errors.push(e));
      await s.start();
      emit();
      await vi.waitFor(() => expect(errors).toHaveLength(1));
      expect(errors[0].code).toBe(
        status !== 401 && status !== 403
          ? 'provider-error'
          : 'authentication-failed'
      );
      expect(errors[0].message).toContain(`HTTP ${status}`);
      expect(errors[0].message).toContain('server detail');
      if (status === 403) expect(errors[0].message).toContain('--cors-origin');
      if (status === 401 || status === 403) {
        expect(s.state).toBe('error');
        expect(stopCapture).toHaveBeenCalled();
      } else {
        expect(s.state).toBe('listening');
        emit();
        await s.stop();
        expect(request).toHaveBeenCalledTimes(2);
      }
    }
  );
  it('reports network failures with CORS guidance and continues', async () => {
    request.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const s = session();
    const errors = vi.fn();
    s.onError(errors);
    await s.start();
    emit();
    emit();
    await s.stop();
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'connection-failed',
        message: expect.stringContaining(window.location.origin),
      })
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([{}, { text: 123 }])(
    'rejects invalid response shapes %j',
    async (body) => {
      request.mockResolvedValueOnce(json(body));
      const s = session();
      const errors = vi.fn();
      s.onError(errors);
      await s.start();
      emit();
      await s.stop();
      expect(errors).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'provider-error' })
      );
    }
  );
  it('rejects invalid JSON', async () => {
    request.mockResolvedValueOnce(new Response('not json'));
    const s = session();
    const errors = vi.fn();
    s.onError(errors);
    await s.start();
    emit();
    await s.stop();
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'provider-error' })
    );
  });
  it('times out through response reading and aborts the request', async () => {
    vi.useFakeTimers();
    request.mockResolvedValueOnce({
      ok: true,
      json: () => new Promise(() => {}),
    } as Response);
    const s = session({ timeoutMs: 50 });
    const errors = vi.fn();
    s.onError(errors);
    await s.start();
    emit();
    const stopped = s.stop();
    await vi.advanceTimersByTimeAsync(50);
    await stopped;
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'connection-failed',
        message: expect.stringContaining('timed out'),
      })
    );
  });
  it('aborts in-flight fetch, discards queued turns and emits nothing after disposal', async () => {
    const response = deferred<Response>();
    request.mockReturnValueOnce(response.promise);
    const s = session();
    const updates = vi.fn();
    const errors = vi.fn();
    s.onTranscript(updates);
    s.onError(errors);
    await s.start();
    emit();
    emit();
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await s.dispose();
    response.resolve(json({ text: 'late' }));
    await Promise.resolve();
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(updates).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(() => s.start()).toThrowError(
      expect.objectContaining({ code: 'session-disposed' })
    );
  });
  it('does not send audio when credentials arrive after disposal', async () => {
    const key = deferred<string>();
    const getApiKey = vi.fn(() => key.promise);
    const s = session({
      auth: {
        type: 'browser-api-key',
        getApiKey,
        acknowledgeBrowserKeyRisk: true,
      },
    });
    await s.start();
    emit();
    await vi.waitFor(() => expect(getApiKey).toHaveBeenCalledOnce());
    await s.dispose();
    key.resolve('late-key');
    await Promise.resolve();
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
  });
  it('stops on a failed credential callback without sending queued audio', async () => {
    const s = session({
      auth: {
        type: 'browser-api-key',
        getApiKey: async () => '',
        acknowledgeBrowserKeyRisk: true,
      },
    });
    const errors = vi.fn();
    s.onError(errors);
    await s.start();
    emit();
    emit();
    await s.stop();
    expect(errors).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
    expect(s.state).toBe('error');
  });
  it('cancels start while microphone permission is pending and releases late tracks', async () => {
    const media = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(media.promise);
    const s = session();
    const errors = vi.fn();
    s.onError(errors);
    const started = s.start();
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    const stopped = s.stop();
    media.resolve({
      getTracks: () => [{ stop: stopTrack } as unknown as MediaStreamTrack],
    } as unknown as MediaStream);
    await Promise.all([started, stopped]);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(s.state).toBe('idle');
    expect(errors).not.toHaveBeenCalled();
  });
  it('discards queued audio even if an auth error listener stops and restarts', async () => {
    request.mockResolvedValueOnce(json({ error: { message: 'bad key' } }, 401));
    const s = session();
    const updates = vi.fn();
    s.onTranscript(updates);
    s.onError(() => {
      void s.stop();
    });
    await s.start();
    emit();
    emit();
    await vi.waitFor(() => expect(s.state).toBe('idle'));
    expect(request).toHaveBeenCalledOnce();
    await s.start();
    emit();
    await s.stop();
    expect(request).toHaveBeenCalledTimes(2);
    expect(updates).toHaveBeenCalledOnce();
  });
  it('maps a dropped response body connection to connection-failed', async () => {
    request.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new TypeError('terminated');
      },
    } as unknown as Response);
    const s = session();
    const errors = vi.fn();
    s.onError(errors);
    await s.start();
    emit();
    await s.stop();
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'connection-failed' })
    );
  });
  it('can stop immediately after start without opening the microphone', async () => {
    const s = session();
    await Promise.all([s.start(), s.stop()]);
    expect(s.state).toBe('idle');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
