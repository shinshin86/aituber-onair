import { TranscriptionSessionError } from '../src/errors';
import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
} from '../src';
import {
  isLikelyWhisperHallucination,
  LocalWhisperTranscriptionSession,
  normalizeWhisperLanguage,
} from '../src/providers/LocalWhisperTranscriptionSession';
import type { LocalWhisperTranscriptionInput } from '../src/providers/LocalWhisperWorkerClient';
import type { BrowserPcmTurnCaptureOptions } from '../src/providers/BrowserPcmTurnCapture';
import type { CapturedAudioTurn } from '../src/providers/PcmTurnAssembler';
import type {
  RealtimeTranscriptionSession,
  LocalWhisperTranscriptionOptions,
  TranscriptUpdate,
  TranscriptionError,
  TranscriptionProgress,
} from '../src/types';
import type { Mock } from 'vitest';

class MockMediaStreamTrack {
  stop = vi.fn();
}

class MockMediaStream {
  readonly track = new MockMediaStreamTrack();

  getTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }
}

class MockWorkerClient {
  hasFailed = false;
  private readonly progressListeners = new Set<
    (progress: TranscriptionProgress) => void
  >();
  load = vi.fn<[], Promise<void>>(async () => undefined);
  transcribe = vi.fn<[LocalWhisperTranscriptionInput], Promise<string>>(
    async () => 'transcribed'
  );
  dispose = vi.fn();

  onProgress(listener: (progress: TranscriptionProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  emitProgress(progress: TranscriptionProgress): void {
    for (const listener of this.progressListeners) listener(progress);
  }
}

class MockCapture {
  start = vi.fn(async () => undefined);
  stop = vi.fn(async () => {
    for (const track of this.stream.getTracks()) track.stop();
  });

  constructor(
    private readonly stream: MediaStream,
    private readonly onTurn: (turn: CapturedAudioTurn) => void
  ) {}

  emitTurn(turn: CapturedAudioTurn): void {
    this.onTurn(turn);
  }
}

function capturedTurn(
  confirmedSpeechDurationMs = 300,
  sampleRate = 16_000
): CapturedAudioTurn {
  return {
    audio: new Float32Array(sampleRate / 2).fill(0.1),
    sampleRate,
    confirmedSpeechDurationMs,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

let activeSessions: RealtimeTranscriptionSession[] = [];
let stream: MockMediaStream;
let workerClient: MockWorkerClient;
let capture: MockCapture | null;
let getUserMedia: Mock<[MediaStreamConstraints], Promise<MockMediaStream>>;
let createWorkerClient: Mock<[workerUrl?: string | URL], MockWorkerClient>;
let createCapture: Mock<
  [MediaStream, BrowserPcmTurnCaptureOptions],
  MockCapture
>;

function createSession(
  options: LocalWhisperTranscriptionOptions = { provider: 'local-whisper' }
): LocalWhisperTranscriptionSession {
  const session = new LocalWhisperTranscriptionSession(options, {
    createWorkerClient,
    createCapture,
  });
  activeSessions.push(session);
  return session;
}

describe('LocalWhisperTranscriptionSession', () => {
  beforeEach(() => {
    activeSessions = [];
    stream = new MockMediaStream();
    workerClient = new MockWorkerClient();
    capture = null;
    getUserMedia = vi.fn(
      async (_constraints: MediaStreamConstraints) => stream
    );
    createWorkerClient = vi.fn((_workerUrl?: string | URL) => workerClient);
    createCapture = vi.fn(
      (mediaStream: MediaStream, options: BrowserPcmTurnCaptureOptions) => {
        capture = new MockCapture(mediaStream, options.onTurn);
        return capture;
      }
    );

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal('AudioContext', class {});
    vi.stubGlobal('AudioWorkletNode', class {});
    vi.stubGlobal('Worker', class {});
  });

  afterEach(async () => {
    await Promise.all(activeSessions.map((session) => session.dispose()));
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    Reflect.deleteProperty(navigator, 'gpu');
    Reflect.deleteProperty(window, 'isSecureContext');
  });

  it('starts capture after loading the worker and exposes fixed capabilities', async () => {
    const session = createSession({
      provider: 'local-whisper',
      silenceDurationMs: 250,
      workerUrl: '/custom-worker.js',
    });

    await session.start();

    expect(session.provider).toBe('local-whisper');
    expect(session.capabilities).toEqual({
      interimResults: false,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: true,
    });
    expect(session.state).toBe('listening');
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(createWorkerClient).toHaveBeenCalledWith('/custom-worker.js');
    expect(createCapture).toHaveBeenCalledWith(
      stream,
      expect.objectContaining({ silenceDurationMs: 250 })
    );
    expect(workerClient.load).toHaveBeenCalledOnce();
    expect(capture?.start).toHaveBeenCalledOnce();
  });

  it('emits worker progress only while connecting', async () => {
    const modelLoad = deferred<void>();
    workerClient.load.mockImplementationOnce(() => modelLoad.promise);
    const session = createSession();
    const progressEvents: TranscriptionProgress[] = [];
    session.onProgress((progress) => progressEvents.push(progress));

    const startPromise = session.start();
    await vi.waitFor(() => {
      expect(workerClient.load).toHaveBeenCalledOnce();
    });
    const downloadProgress: TranscriptionProgress = {
      phase: 'download',
      file: 'model.onnx',
      loadedBytes: 50,
      totalBytes: 100,
      progress: 0.5,
    };
    workerClient.emitProgress(downloadProgress);
    modelLoad.resolve();
    await startPromise;

    workerClient.emitProgress({ phase: 'initialize' });
    const stopPromise = session.stop();
    workerClient.emitProgress({ phase: 'ready' });
    await stopPromise;

    expect(progressEvents).toEqual([downloadProgress]);
  });

  it('is created by the public factory when browser support is available', async () => {
    expect(isTranscriptionProviderSupported('local-whisper')).toBe(true);

    const session = createRealtimeTranscriptionSession({
      provider: 'local-whisper',
      language: 'ja-JP',
    });
    activeSessions.push(session);

    expect(session).toBeInstanceOf(LocalWhisperTranscriptionSession);
    expect(session.provider).toBe('local-whisper');
  });

  it('normalizes the language and emits ordered final transcripts', async () => {
    const firstResult = deferred<string>();
    const secondResult = deferred<string>();
    workerClient.transcribe
      .mockImplementationOnce(() => firstResult.promise)
      .mockImplementationOnce(() => secondResult.promise);
    const session = createSession({
      provider: 'local-whisper',
      language: 'JA_jP',
    });
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();

    capture?.emitTurn(capturedTurn());
    capture?.emitTurn(capturedTurn());
    await vi.waitFor(() => {
      expect(workerClient.transcribe).toHaveBeenCalledTimes(1);
    });
    firstResult.resolve(' 最初 ');
    await vi.waitFor(() => {
      expect(workerClient.transcribe).toHaveBeenCalledTimes(2);
    });
    secondResult.resolve('次');
    await vi.waitFor(() => {
      expect(updates).toHaveLength(2);
    });

    expect(workerClient.transcribe.mock.calls[0]?.[0].language).toBe('ja');
    expect(updates).toEqual([
      {
        utteranceId: 'local-whisper:1',
        text: '最初',
        isFinal: true,
      },
      {
        utteranceId: 'local-whisper:2',
        text: '次',
        isFinal: true,
      },
    ]);
  });

  it('drops short turns, empty output, and known hallucinations', async () => {
    workerClient.transcribe
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(' ご視聴ありがとうございました！！ ')
      .mockResolvedValueOnce('有効な発話');
    const session = createSession();
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();

    capture?.emitTurn(capturedTurn(299));
    capture?.emitTurn(capturedTurn(300));
    capture?.emitTurn(capturedTurn(300));
    capture?.emitTurn(capturedTurn(300));
    await session.stop();

    expect(workerClient.transcribe).toHaveBeenCalledTimes(3);
    expect(updates).toEqual([
      {
        utteranceId: 'local-whisper:3',
        text: '有効な発話',
        isFinal: true,
      },
    ]);
  });

  it('flushes the final capture turn and waits for inference on stop', async () => {
    const result = deferred<string>();
    workerClient.transcribe.mockImplementationOnce(() => result.promise);
    const session = createSession();
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();
    capture?.stop.mockImplementationOnce(async () => {
      capture?.emitTurn(capturedTurn());
      stream.track.stop();
    });

    const stopPromise = session.stop();
    await vi.waitFor(() => {
      expect(workerClient.transcribe).toHaveBeenCalledOnce();
    });
    expect(session.state).toBe('stopping');
    result.resolve('停止時の発話');
    await stopPromise;

    expect(updates[0]?.text).toBe('停止時の発話');
    expect(session.state).toBe('idle');
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(workerClient.dispose).not.toHaveBeenCalled();
  });

  it('cancels a connecting session without emitting an error', async () => {
    const modelLoad = deferred<void>();
    workerClient.load.mockImplementationOnce(() => modelLoad.promise);
    const session = createSession();
    const errors = vi.fn();
    session.onError(errors);

    const startPromise = session.start();
    await vi.waitFor(() => {
      expect(capture).not.toBeNull();
    });
    const stopPromise = session.stop();
    expect(session.state).toBe('stopping');
    expect(stream.track.stop).toHaveBeenCalled();

    modelLoad.resolve();
    await Promise.all([startPromise, stopPromise]);

    expect(session.state).toBe('idle');
    expect(errors).not.toHaveBeenCalled();
  });

  it('reuses the warm worker client after stop and restart', async () => {
    const session = createSession();
    await session.start();
    await session.stop();

    await session.start();

    expect(createWorkerClient).toHaveBeenCalledOnce();
    expect(workerClient.load).toHaveBeenCalledTimes(2);
    expect(createCapture).toHaveBeenCalledTimes(2);
    expect(session.state).toBe('listening');
  });

  it('maps microphone permission rejection to a typed error', async () => {
    getUserMedia.mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );
    const session = createSession();
    const errors: TranscriptionError[] = [];
    session.onError((error) => errors.push(error));

    await expect(session.start()).rejects.toMatchObject({
      code: 'permission-denied',
      provider: 'local-whisper',
    });

    expect(errors).toHaveLength(1);
    expect(session.state).toBe('error');
    expect(createWorkerClient).not.toHaveBeenCalled();
  });

  it('maps model initialization failure and releases resources', async () => {
    workerClient.load.mockRejectedValueOnce(new Error('model unavailable'));
    const session = createSession();

    await expect(session.start()).rejects.toMatchObject({
      code: 'provider-error',
      message: 'Failed to initialize the local Whisper model.',
    });

    expect(capture?.stop).toHaveBeenCalledOnce();
    expect(workerClient.dispose).toHaveBeenCalledOnce();
    expect(session.state).toBe('error');
  });

  it('keeps a request-level inference failure recoverable', async () => {
    workerClient.transcribe
      .mockRejectedValueOnce(new Error('request failed'))
      .mockResolvedValueOnce('recovered');
    const session = createSession();
    const errors: TranscriptionError[] = [];
    const updates: TranscriptUpdate[] = [];
    session.onError((error) => errors.push(error));
    session.onTranscript((update) => updates.push(update));
    await session.start();

    capture?.emitTurn(capturedTurn());
    capture?.emitTurn(capturedTurn());
    await session.stop();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'provider-error' });
    expect(updates[0]?.text).toBe('recovered');
    expect(session.state).toBe('idle');
  });

  it('enters error and stops capture after a fatal worker failure', async () => {
    workerClient.hasFailed = true;
    workerClient.transcribe.mockRejectedValueOnce(
      new Error('WebGPU device lost')
    );
    const session = createSession();
    await session.start();

    capture?.emitTurn(capturedTurn());
    await vi.waitFor(() => {
      expect(session.state).toBe('error');
    });

    expect(workerClient.dispose).toHaveBeenCalledOnce();
    expect(capture?.stop).toHaveBeenCalledOnce();
  });

  it('disposes capture and worker and rejects a later start', async () => {
    const session = createSession();
    await session.start();

    await session.dispose();

    expect(capture?.stop).toHaveBeenCalledOnce();
    expect(workerClient.dispose).toHaveBeenCalledOnce();
    expect(session.state).toBe('disposed');
    expect(() => session.start()).toThrow(TranscriptionSessionError);
  });

  it('rejects unsupported WebGPU and invalid options', async () => {
    Reflect.deleteProperty(navigator, 'gpu');
    const unsupportedSession = createSession();

    await expect(unsupportedSession.start()).rejects.toMatchObject({
      code: 'unsupported-provider',
      message: 'Local Whisper transcription requires WebGPU support.',
    });
    expect(() =>
      createSession({
        provider: 'local-whisper',
        silenceDurationMs: 149,
      })
    ).toThrowError(expect.objectContaining({ code: 'invalid-configuration' }));
  });
});

describe('local Whisper text helpers', () => {
  it('normalizes BCP 47-style language hints', () => {
    expect(normalizeWhisperLanguage(undefined)).toBeUndefined();
    expect(normalizeWhisperLanguage('ja')).toBe('ja');
    expect(normalizeWhisperLanguage('JA_jP')).toBe('ja');
    expect(normalizeWhisperLanguage('en-GB')).toBe('en');
    expect(normalizeWhisperLanguage('fr-FR')).toBe('fr');
  });

  it('matches hallucinations after NFKC and trailing punctuation cleanup', () => {
    expect(
      isLikelyWhisperHallucination(' ご視聴ありがとうございました！！ ')
    ).toBe(true);
    expect(isLikelyWhisperHallucination('Ｔｈａｎｋ ｙｏｕ．')).toBe(true);
    expect(isLikelyWhisperHallucination('THANKS FOR WATCHING!')).toBe(true);
    expect(isLikelyWhisperHallucination('通常の発話です')).toBe(false);
  });
});
