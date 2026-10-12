import { BaseRealtimeTranscriptionSession } from '../BaseRealtimeTranscriptionSession';
import { TranscriptionSessionError } from '../errors';
import type { OpenAICompatibleTranscriptionOptions } from '../types';
import { isTranscriptionProviderSupported } from '../support';
import {
  encodeTranscriptionWav,
  resolveOpenAICompatibleTranscriptionEndpoint,
} from './openaiCompatibleTranscription';
import {
  BrowserPcmTurnCapture,
  type BrowserPcmTurnCaptureOptions,
} from './BrowserPcmTurnCapture';
import type { CapturedAudioTurn } from './PcmTurnAssembler';
import { resampleTo16k } from './resampleTo16k';
import {
  isLikelyWhisperHallucination,
  normalizeWhisperLanguage,
} from './whisperText';

class SessionOperationCancelled extends Error {}

interface Capture {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface SessionDependencies {
  createCapture(
    stream: MediaStream,
    options: BrowserPcmTurnCaptureOptions
  ): Capture;
  fetch: typeof fetch;
}

const DEFAULT_DEPENDENCIES: SessionDependencies = {
  createCapture: (stream, options) =>
    new BrowserPcmTurnCapture(stream, options),
  fetch: (...args) => fetch(...args),
};

function validateOptions(options: OpenAICompatibleTranscriptionOptions): void {
  if (
    options.silenceDurationMs !== undefined &&
    (!Number.isFinite(options.silenceDurationMs) ||
      options.silenceDurationMs < 150)
  ) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'openai-compatible',
      'silenceDurationMs must be at least 150.'
    );
  }
  if (
    options.timeoutMs !== undefined &&
    (!Number.isFinite(options.timeoutMs) ||
      options.timeoutMs <= 0 ||
      options.timeoutMs > 2147483647)
  ) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'openai-compatible',
      'timeoutMs must be positive and no greater than 2147483647.'
    );
  }
  if (
    options.auth &&
    (options.auth.type !== 'browser-api-key' ||
      options.auth.acknowledgeBrowserKeyRisk !== true ||
      typeof options.auth.getApiKey !== 'function')
  ) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'openai-compatible',
      'Browser API keys require getApiKey and acknowledgeBrowserKeyRisk: true.'
    );
  }
}

function isPermissionDenied(cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
  );
}

export class OpenAICompatibleTranscriptionSession extends BaseRealtimeTranscriptionSession {
  private readonly endpoint: string;
  private readonly model: string | undefined;
  private readonly prompt: string | undefined;
  private readonly timeoutMs: number;
  private readonly auth: OpenAICompatibleTranscriptionOptions['auth'];
  private readonly language: string | undefined;
  private readonly silenceDurationMs: number;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private operationId = 0;
  private activeRequest: AbortController | null = null;
  private captureCleanup = Promise.resolve();
  private capture: Capture | null = null;
  private transcriptionQueue = Promise.resolve();
  private utteranceSequence = 0;
  private discardQueuedTurns = false;

  constructor(
    options: OpenAICompatibleTranscriptionOptions,
    private readonly dependencies: SessionDependencies = DEFAULT_DEPENDENCIES
  ) {
    super('openai-compatible', {
      interimResults: false,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: false,
    });
    validateOptions(options);
    this.endpoint = resolveOpenAICompatibleTranscriptionEndpoint(
      options.baseUrl
    );
    this.model = options.model?.trim() || undefined;
    this.prompt = options.prompt?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.auth = options.auth ? { ...options.auth } : undefined;
    this.language = normalizeWhisperLanguage(options.language);
    this.silenceDurationMs = options.silenceDurationMs ?? 500;
  }

  start(): Promise<void> {
    this.assertNotDisposed();
    if (this.startPromise) return this.startPromise;
    if (this.state === 'listening') return Promise.resolve();

    const promise = this.startWhenReady();
    this.startPromise = promise;
    void promise.then(
      () => {
        if (this.startPromise === promise) this.startPromise = null;
      },
      () => {
        if (this.startPromise === promise) this.startPromise = null;
      }
    );
    return promise;
  }

  private async startWhenReady(): Promise<void> {
    if (this.stopPromise) await this.stopPromise;
    this.assertNotDisposed();
    if (this.state === 'listening') return;

    this.operationId += 1;
    const operationId = this.operationId;
    this.changeState('connecting');
    await this.connect(operationId);
  }

  private async connect(operationId: number): Promise<void> {
    let localStream: MediaStream | null = null;
    let localCapture: Capture | null = null;

    try {
      this.assertBrowserSupport();
      await this.transcriptionQueue;
      await this.captureCleanup;
      this.assertOperation(operationId);
      this.discardQueuedTurns = false;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (cause) {
        throw isPermissionDenied(cause)
          ? new TranscriptionSessionError(
              'permission-denied',
              this.provider,
              'Microphone permission was denied.',
              { cause }
            )
          : new TranscriptionSessionError(
              'provider-error',
              this.provider,
              'The microphone could not be opened for OpenAI-compatible transcription.',
              { cause }
            );
      }
      this.assertOperation(operationId);

      localCapture = this.dependencies.createCapture(localStream, {
        silenceDurationMs: this.silenceDurationMs,
        onTurn: (turn) => this.queueTurn(turn),
      });
      this.capture = localCapture;

      try {
        await localCapture.start();
      } catch (cause) {
        throw new TranscriptionSessionError(
          'provider-error',
          this.provider,
          'Failed to start OpenAI-compatible transcription audio capture.',
          { cause }
        );
      }
      this.assertOperation(operationId);
      this.changeState('listening');
    } catch (cause) {
      if (localCapture) await localCapture.stop().catch(() => undefined);
      else for (const track of localStream?.getTracks() ?? []) track.stop();
      if (this.capture === localCapture) this.capture = null;

      if (
        cause instanceof SessionOperationCancelled ||
        operationId !== this.operationId
      ) {
        if (this.state === 'disposed') {
          throw new TranscriptionSessionError(
            'session-disposed',
            this.provider,
            'The transcription session was disposed while connecting.'
          );
        }
        return;
      }

      const error =
        cause instanceof TranscriptionSessionError
          ? cause
          : new TranscriptionSessionError(
              'provider-error',
              this.provider,
              'OpenAI-compatible transcription could not start.',
              { cause }
            );
      this.changeState('error');
      this.emitError(error);
      throw error;
    }
  }

  stop(): Promise<void> {
    if (this.state === 'disposed' || this.state === 'idle') {
      return Promise.resolve();
    }
    if (this.stopPromise) return this.stopPromise;

    this.operationId += 1;
    const pendingStart = this.startPromise;
    this.changeState('stopping');
    const promise = this.stopAndFlush(pendingStart);
    this.stopPromise = promise;
    void promise.then(
      () => {
        if (this.stopPromise === promise) this.stopPromise = null;
      },
      () => {
        if (this.stopPromise === promise) this.stopPromise = null;
      }
    );
    return promise;
  }

  private async stopAndFlush(
    pendingStart: Promise<void> | null
  ): Promise<void> {
    const capture = this.capture;
    this.capture = null;
    await capture?.stop().catch(() => undefined);
    await pendingStart?.catch(() => undefined);
    await this.transcriptionQueue;
    if (this.state === 'stopping') this.changeState('idle');
  }

  async dispose(): Promise<void> {
    if (this.state === 'disposed') return;

    this.operationId += 1;
    this.discardQueuedTurns = true;
    this.changeState('disposed');
    this.activeRequest?.abort();
    const capture = this.capture;
    this.capture = null;
    await capture?.stop().catch(() => undefined);

    await this.transcriptionQueue.catch(() => undefined);
    await this.captureCleanup;
    this.clearListeners();
  }

  private queueTurn(turn: CapturedAudioTurn): void {
    if (this.state !== 'listening' && this.state !== 'stopping') return;
    if (turn.confirmedSpeechDurationMs < 300) return;
    const utteranceId = `openai-compatible:${++this.utteranceSequence}`;
    const audio = resampleTo16k(turn.audio, turn.sampleRate);
    this.transcriptionQueue = this.transcriptionQueue
      .then(async () => {
        if (this.discardQueuedTurns || this.isDisposed()) return;
        try {
          const text = (await this.transcribe(audio)).trim();
          if (this.isDisposed() || !text || isLikelyWhisperHallucination(text))
            return;
          this.emitTranscript({ utteranceId, text, isFinal: true });
        } catch (cause) {
          if (this.isDisposed()) return;
          const error =
            cause instanceof TranscriptionSessionError
              ? cause
              : new TranscriptionSessionError(
                  'provider-error',
                  this.provider,
                  'Audio transcription failed.',
                  { cause }
                );
          // Authentication/configuration needs user action; transient failures
          // discard only this turn and leave capture available for the next one.
          if (
            error.code === 'authentication-failed' ||
            error.code === 'invalid-configuration'
          ) {
            const capture = this.capture;
            this.capture = null;
            this.discardQueuedTurns = true;
            this.changeState('error');
            this.captureCleanup =
              capture?.stop().catch(() => undefined) ?? Promise.resolve();
          }
          this.emitError(error);
        }
      })
      .catch(() => undefined);
  }

  private isDisposed(): boolean {
    return this.state === 'disposed';
  }

  private corsHint(): string {
    const origin =
      typeof window === 'undefined'
        ? 'the page origin'
        : window.location.origin;
    return `Check the server URL, network, mixed-content restrictions, and CORS for ${origin}. For speech.cpp, allow this page with --cors-origin ${origin}.`;
  }

  private async transcribe(audio: Float32Array): Promise<string> {
    const controller = new AbortController();
    this.activeRequest = controller;
    const timer = setTimeout(
      () =>
        controller.abort(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            `Audio transcription timed out after ${this.timeoutMs} ms. ${this.corsHint()}`
          )
        ),
      this.timeoutMs
    );
    let onAbort = () => {};
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      return await Promise.race([
        this.sendAudio(audio, controller.signal),
        aborted,
      ]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      if (this.activeRequest === controller) this.activeRequest = null;
    }
  }

  private async sendAudio(
    audio: Float32Array,
    signal: AbortSignal
  ): Promise<string> {
    const headers: Record<string, string> = {};
    if (this.auth) {
      let key: string;
      try {
        key = (await this.auth.getApiKey()).trim();
        if (!key) throw new Error('Empty API key');
      } catch (cause) {
        throw new TranscriptionSessionError(
          'authentication-failed',
          this.provider,
          'Could not obtain an API key for the transcription server.',
          { cause }
        );
      }
      headers.Authorization = `Bearer ${key}`;
    }
    signal.throwIfAborted();
    const form = new FormData();
    form.append(
      'file',
      new Blob([encodeTranscriptionWav(audio)], { type: 'audio/wav' }),
      'utterance.wav'
    );
    form.append('response_format', 'json');
    if (this.model) form.append('model', this.model);
    if (this.language) form.append('language', this.language);
    if (this.prompt) form.append('prompt', this.prompt);
    let response: Response;
    try {
      response = await this.dependencies.fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: form,
        signal,
        credentials: 'omit',
        redirect: 'error',
      });
    } catch (cause) {
      throw new TranscriptionSessionError(
        'connection-failed',
        this.provider,
        `Could not reach the transcription server. ${this.corsHint()}`,
        { cause }
      );
    }
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const detail = errorDetail(body);
      const authFailed = response.status === 401 || response.status === 403;
      const hint = detail.includes('origin_not_allowed')
        ? ` ${this.corsHint()}`
        : '';
      throw new TranscriptionSessionError(
        authFailed ? 'authentication-failed' : 'provider-error',
        this.provider,
        `Audio transcription failed (HTTP ${response.status})${detail ? `: ${detail}` : '.'}${hint}`
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      const networkFailure = cause instanceof TypeError;
      throw new TranscriptionSessionError(
        networkFailure ? 'connection-failed' : 'provider-error',
        this.provider,
        networkFailure
          ? `Could not read the transcription response. ${this.corsHint()}`
          : 'The transcription server returned invalid JSON.',
        { cause }
      );
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('text' in body) ||
      typeof body.text !== 'string'
    ) {
      throw new TranscriptionSessionError(
        'provider-error',
        this.provider,
        'The transcription response must contain a string text field.'
      );
    }
    return body.text;
  }

  private assertBrowserSupport(): void {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      throw new TranscriptionSessionError(
        'insecure-context',
        this.provider,
        'Microphone transcription requires HTTPS or localhost.'
      );
    }
    if (!isTranscriptionProviderSupported(this.provider)) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'OpenAI-compatible transcription requires a browser with microphone access, Web Audio, AudioWorklet, fetch, and FormData.'
      );
    }
  }

  private assertOperation(operationId: number): void {
    if (operationId !== this.operationId || this.state === 'disposed') {
      throw new SessionOperationCancelled();
    }
  }
}

function errorDetail(body: unknown): string {
  if (!body || typeof body !== 'object' || !('error' in body)) return '';
  if (typeof body.error === 'string') return body.error;
  if (!body.error || typeof body.error !== 'object') return '';
  const error = body.error;
  return [
    'code' in error && typeof error.code === 'string' ? error.code : '',
    'message' in error && typeof error.message === 'string'
      ? error.message
      : '',
  ]
    .filter(Boolean)
    .join(': ');
}
