import { BaseRealtimeTranscriptionSession } from '../BaseRealtimeTranscriptionSession';
import { TranscriptionSessionError } from '../errors';
import type {
  LocalWhisperTranscriptionOptions,
  TranscriptionProgress,
} from '../types';
import {
  BrowserPcmTurnCapture,
  type BrowserPcmTurnCaptureOptions,
} from './BrowserPcmTurnCapture';
import { LocalWhisperWorkerClient } from './LocalWhisperWorkerClient';
import type { CapturedAudioTurn } from './PcmTurnAssembler';
import { resampleTo16k } from './resampleTo16k';

const DEFAULT_SILENCE_DURATION_MS = 500;
const MIN_SILENCE_DURATION_MS = 150;
const MIN_UTTERANCE_MS = 300;

const WHISPER_HALLUCINATIONS = [
  'ご視聴ありがとうございました',
  'ご視聴ありがとうございます',
  'おやすみなさい',
  'チャンネル登録お願いします',
  'Thank you.',
  'Thanks for watching.',
  'Thank you for watching.',
];

const TRAILING_PUNCTUATION = /[。．.！!？?]+$/u;

interface LocalWhisperWorker {
  readonly hasFailed: boolean;
  load(): Promise<void>;
  onProgress(listener: (progress: TranscriptionProgress) => void): () => void;
  transcribe(input: {
    audio: Float32Array;
    language?: string;
  }): Promise<string>;
  dispose(): void;
}

interface LocalWhisperCapture {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface LocalWhisperSessionDependencies {
  createWorkerClient(workerUrl?: string | URL): LocalWhisperWorker;
  createCapture(
    stream: MediaStream,
    options: BrowserPcmTurnCaptureOptions
  ): LocalWhisperCapture;
}

interface LocalWhisperNavigator extends Navigator {
  gpu?: unknown;
}

interface LocalWhisperWindow extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

class SessionOperationCancelled extends Error {}

const DEFAULT_DEPENDENCIES: LocalWhisperSessionDependencies = {
  createWorkerClient: (workerUrl) =>
    workerUrl
      ? new LocalWhisperWorkerClient(workerUrl)
      : new LocalWhisperWorkerClient(),
  createCapture: (stream, options) =>
    new BrowserPcmTurnCapture(stream, options),
};

function normalizedHallucinationText(text: string): string {
  return text
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(TRAILING_PUNCTUATION, '')
    .trim();
}

const NORMALIZED_WHISPER_HALLUCINATIONS = new Set(
  WHISPER_HALLUCINATIONS.map(normalizedHallucinationText)
);

export function isLikelyWhisperHallucination(text: string): boolean {
  return NORMALIZED_WHISPER_HALLUCINATIONS.has(
    normalizedHallucinationText(text)
  );
}

export function normalizeWhisperLanguage(
  language: string | undefined
): string | undefined {
  return language?.trim().replace(/_/g, '-').toLowerCase().split('-')[0];
}

function validateOptions(options: LocalWhisperTranscriptionOptions): void {
  if (options.language !== undefined && !options.language.trim()) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'local-whisper',
      'The local Whisper language code cannot be empty.'
    );
  }

  if (
    options.silenceDurationMs !== undefined &&
    (!Number.isFinite(options.silenceDurationMs) ||
      options.silenceDurationMs < MIN_SILENCE_DURATION_MS)
  ) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'local-whisper',
      `Local Whisper silenceDurationMs must be at least ${MIN_SILENCE_DURATION_MS}.`
    );
  }
}

function isPermissionDenied(cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
  );
}

export class LocalWhisperTranscriptionSession extends BaseRealtimeTranscriptionSession {
  private readonly language: string | undefined;
  private readonly silenceDurationMs: number;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private operationId = 0;
  private workerClient: LocalWhisperWorker | null = null;
  private workerProgressUnsubscribe: (() => void) | null = null;
  private capture: LocalWhisperCapture | null = null;
  private transcriptionQueue = Promise.resolve();
  private utteranceSequence = 0;

  constructor(
    private readonly options: LocalWhisperTranscriptionOptions,
    private readonly dependencies: LocalWhisperSessionDependencies = DEFAULT_DEPENDENCIES
  ) {
    super('local-whisper', {
      interimResults: false,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: true,
    });
    validateOptions(options);
    this.language = normalizeWhisperLanguage(options.language);
    this.silenceDurationMs =
      options.silenceDurationMs ?? DEFAULT_SILENCE_DURATION_MS;
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
    let localCapture: LocalWhisperCapture | null = null;
    let localWorkerClient: LocalWhisperWorker | null = null;

    try {
      this.assertBrowserSupport();
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
              'The microphone could not be opened for local Whisper.',
              { cause }
            );
      }
      this.assertOperation(operationId);

      if (this.workerClient) {
        localWorkerClient = this.workerClient;
      } else {
        localWorkerClient = this.dependencies.createWorkerClient(
          this.options.workerUrl
        );
        this.workerClient = localWorkerClient;
        this.workerProgressUnsubscribe = localWorkerClient.onProgress(
          (progress) => {
            if (this.state === 'connecting') this.emitProgress(progress);
          }
        );
      }
      localCapture = this.dependencies.createCapture(localStream, {
        silenceDurationMs: this.silenceDurationMs,
        onTurn: (turn) => this.queueTurn(turn),
      });
      this.capture = localCapture;

      try {
        await localWorkerClient.load();
      } catch (cause) {
        throw new TranscriptionSessionError(
          'provider-error',
          this.provider,
          'Failed to initialize the local Whisper model.',
          { cause }
        );
      }
      this.assertOperation(operationId);

      try {
        await localCapture.start();
      } catch (cause) {
        throw new TranscriptionSessionError(
          'provider-error',
          this.provider,
          'Failed to start local Whisper audio capture.',
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

      if (this.workerClient === localWorkerClient) {
        this.workerProgressUnsubscribe?.();
        this.workerProgressUnsubscribe = null;
        this.workerClient = null;
      }
      localWorkerClient?.dispose();
      const error =
        cause instanceof TranscriptionSessionError
          ? cause
          : new TranscriptionSessionError(
              'provider-error',
              this.provider,
              'Local Whisper transcription could not start.',
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
    this.changeState('disposed');
    const capture = this.capture;
    this.capture = null;
    await capture?.stop().catch(() => undefined);

    const workerClient = this.workerClient;
    this.workerClient = null;
    this.workerProgressUnsubscribe?.();
    this.workerProgressUnsubscribe = null;
    workerClient?.dispose();
    await this.transcriptionQueue.catch(() => undefined);
    this.clearListeners();
  }

  private queueTurn(turn: CapturedAudioTurn): void {
    if (this.state !== 'listening' && this.state !== 'stopping') return;
    if (turn.confirmedSpeechDurationMs < MIN_UTTERANCE_MS) return;

    const workerClient = this.workerClient;
    if (!workerClient) return;
    const utteranceId = `local-whisper:${++this.utteranceSequence}`;
    const audio = resampleTo16k(turn.audio, turn.sampleRate);
    const operation = this.transcriptionQueue.then(async () => {
      if (this.state === 'disposed') return;

      let text: string;
      try {
        text = await workerClient.transcribe({
          audio,
          ...(this.language ? { language: this.language } : {}),
        });
      } catch (cause) {
        this.handleInferenceFailure(workerClient, cause);
        return;
      }

      const normalizedText = text.trim();
      if (this.shouldSuppressTranscript(normalizedText)) return;
      this.emitTranscript({
        utteranceId,
        text: normalizedText,
        isFinal: true,
      });
    });
    this.transcriptionQueue = operation.catch(() => undefined);
  }

  private shouldSuppressTranscript(text: string): boolean {
    return (
      this.state === 'disposed' || !text || isLikelyWhisperHallucination(text)
    );
  }

  private handleInferenceFailure(
    workerClient: LocalWhisperWorker,
    cause: unknown
  ): void {
    if (this.state === 'disposed') return;

    const error = new TranscriptionSessionError(
      'provider-error',
      this.provider,
      'Local Whisper transcription failed.',
      { cause }
    );
    if (workerClient.hasFailed && workerClient === this.workerClient) {
      this.operationId += 1;
      this.workerClient = null;
      this.workerProgressUnsubscribe?.();
      this.workerProgressUnsubscribe = null;
      workerClient.dispose();
      const capture = this.capture;
      this.capture = null;
      this.changeState('error');
      void capture?.stop().catch(() => undefined);
    }
    this.emitError(error);
  }

  private assertBrowserSupport(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires a browser.'
      );
    }
    if (window.isSecureContext === false) {
      throw new TranscriptionSessionError(
        'insecure-context',
        this.provider,
        'Local Whisper transcription requires HTTPS or localhost.'
      );
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires microphone access.'
      );
    }
    const browser = window as LocalWhisperWindow;
    if (!(browser.AudioContext ?? browser.webkitAudioContext)) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires the Web Audio API.'
      );
    }
    if (typeof AudioWorkletNode === 'undefined') {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires AudioWorklet support.'
      );
    }
    if (typeof Worker === 'undefined') {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires Web Worker support.'
      );
    }
    if (!(navigator as LocalWhisperNavigator).gpu) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Local Whisper transcription requires WebGPU support.'
      );
    }
  }

  private assertOperation(operationId: number): void {
    if (operationId !== this.operationId || this.state === 'disposed') {
      throw new SessionOperationCancelled();
    }
  }
}
