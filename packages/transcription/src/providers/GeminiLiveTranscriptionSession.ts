import { BaseRealtimeTranscriptionSession } from '../BaseRealtimeTranscriptionSession';
import { TranscriptionSessionError } from '../errors';
import type {
  GeminiLiveAuth,
  GeminiLiveTranscriptionOptions,
  TranscriptionError,
} from '../types';
import { BrowserPcmStreamCapture } from './BrowserPcmStreamCapture';

const GEMINI_TRANSCRIPTION_MODEL = 'gemini-3.5-transcribe-live';
const API_KEY_WEBSOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const EPHEMERAL_TOKEN_WEBSOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
const CONNECTION_TIMEOUT_MS = 10_000;
const STOP_FINALIZATION_TIMEOUT_MS = 5_000;
const WEBSOCKET_CLOSE_GRACE_MS = 500;
const MAX_CLOSE_REASON_LENGTH = 300;

interface GeminiLiveCredential {
  type: GeminiLiveAuth['type'];
  value: string;
}

interface GeminiLiveServerMessage {
  setupComplete?: unknown;
  serverContent?: {
    interimInputTranscription?: { text?: unknown };
    inputTranscription?: { text?: unknown };
  };
  error?: {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
}

interface StopFinalization {
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

class SessionOperationCancelled extends Error {}

function normalizedCloseReason(reason: string): string {
  return reason.trim().replace(/\s+/g, ' ').slice(0, MAX_CLOSE_REASON_LENGTH);
}

function isAuthenticationCloseReason(reason: string): boolean {
  return /api.?key|authenticat|unauthenticated|credential|permission.?denied/i.test(
    reason
  );
}

function errorFromCloseEvent(
  event: CloseEvent,
  phase: 'setup' | 'runtime'
): TranscriptionSessionError {
  const reason = normalizedCloseReason(event.reason);
  const detail = `code ${event.code}${reason ? `: ${reason}` : ''}`;
  const code = isAuthenticationCloseReason(reason)
    ? 'authentication-failed'
    : event.code === 1006 || event.code >= 1011
      ? 'connection-failed'
      : 'provider-error';
  const message =
    phase === 'setup'
      ? `Gemini Live closed before setup completed (${detail}).`
      : `The Gemini Live connection closed unexpectedly (${detail}).`;
  return new TranscriptionSessionError(code, 'gemini-live', message);
}

function isPermissionDenied(cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
  );
}

function validateOptions(options: GeminiLiveTranscriptionOptions): void {
  if (options.languages?.some((language) => !language.trim())) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'gemini-live',
      'Gemini transcription language codes cannot be empty.'
    );
  }
  if (options.keywords?.some((keyword) => !keyword.trim())) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'gemini-live',
      'Gemini transcription keywords cannot be empty.'
    );
  }
  if ((options.keywords?.length ?? 0) > 1_000) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'gemini-live',
      'Gemini transcription accepts at most 1,000 keywords.'
    );
  }
  if (
    options.mode !== undefined &&
    options.mode !== 'verbatim' &&
    options.mode !== 'smart'
  ) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'gemini-live',
      'Gemini transcription mode must be verbatim or smart.'
    );
  }
}

function createSetupMessage(
  options: GeminiLiveTranscriptionOptions
): Record<string, unknown> {
  const inputAudioTranscription: Record<string, unknown> = {
    languageCodes: options.languages?.map((language) => language.trim()) ?? [],
    mode: (options.mode ?? 'verbatim').toUpperCase(),
  };
  if (options.keywords?.length) {
    inputAudioTranscription.customVocabulary = options.keywords.map((keyword) =>
      keyword.trim()
    );
  }

  return {
    setup: {
      model: `models/${GEMINI_TRANSCRIPTION_MODEL}`,
      generationConfig: {
        responseModalities: ['TEXT'],
      },
      inputAudioTranscription,
    },
  };
}

export function pcm16BytesToBase64(input: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < input.length; index += 1) {
    binary += String.fromCharCode(input[index]);
  }
  return btoa(binary);
}

export class GeminiLiveTranscriptionSession extends BaseRealtimeTranscriptionSession {
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private operationId = 0;
  private socket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private capture: BrowserPcmStreamCapture | null = null;
  private utteranceSequence = 0;
  private activeUtteranceId: string | null = null;
  private stopFinalization: StopFinalization | null = null;
  private connectionCancel: (() => void) | null = null;
  private socketErrorFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: GeminiLiveTranscriptionOptions) {
    super('gemini-live', {
      interimResults: true,
      multipleLanguages: true,
      keywords: true,
      configurableDelay: false,
    });
    validateOptions(options);
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
    let localSocket: WebSocket | null = null;
    let localCapture: BrowserPcmStreamCapture | null = null;

    try {
      this.assertBrowserSupport();
      const credential = await this.getCredential();
      this.assertOperation(operationId);

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
              'The microphone could not be opened for Gemini Live.',
              { cause }
            );
      }
      this.assertOperation(operationId);

      localSocket = new WebSocket(this.createWebSocketUrl(credential));
      const connectedSocket = localSocket;
      this.socket = localSocket;
      this.mediaStream = localStream;
      await this.openAndConfigure(localSocket, operationId);
      this.assertOperation(operationId);

      localCapture = new BrowserPcmStreamCapture(localStream, {
        onChunk: (pcm16) => this.sendAudioChunk(connectedSocket, pcm16),
      });
      this.capture = localCapture;
      await localCapture.start();
      this.assertOperation(operationId);

      this.attachRuntimeListeners(localSocket);
      this.changeState('listening');
    } catch (cause) {
      if (localCapture) await localCapture.stop().catch(() => undefined);
      else for (const track of localStream?.getTracks() ?? []) track.stop();
      if (this.capture === localCapture) this.capture = null;
      if (this.mediaStream === localStream) this.mediaStream = null;
      if (this.socket === localSocket) this.socket = null;
      this.closeSocket(localSocket);

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
              'connection-failed',
              this.provider,
              'Gemini Live transcription could not start.',
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

    const wasConnecting = this.state === 'connecting';
    this.operationId += 1;
    const pendingStart = this.startPromise;
    this.changeState('stopping');
    const promise = this.stopAndFinalize(pendingStart, wasConnecting);
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

  private async stopAndFinalize(
    pendingStart: Promise<void> | null,
    wasConnecting: boolean
  ): Promise<void> {
    if (wasConnecting) this.cleanupResources();
    const capture = this.capture;
    this.capture = null;
    await capture?.stop().catch(() => undefined);
    await pendingStart?.catch(() => undefined);

    const socket = this.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      await this.waitForFinalTranscript();
    }

    this.cleanupResources();
    if (this.state === 'stopping') this.changeState('idle');
  }

  async dispose(): Promise<void> {
    if (this.state === 'disposed') return;

    this.operationId += 1;
    this.changeState('disposed');
    const capture = this.capture;
    this.capture = null;
    await capture?.stop().catch(() => undefined);
    this.cleanupResources();
    this.clearListeners();
  }

  private async getCredential(): Promise<GeminiLiveCredential> {
    if (this.options.auth.type === 'ephemeral-token') {
      let token: string;
      try {
        token = (await this.options.auth.getEphemeralToken()).trim();
      } catch (cause) {
        throw new TranscriptionSessionError(
          'ephemeral-token-failed',
          this.provider,
          'The Gemini ephemeral-token endpoint was unavailable.',
          { cause }
        );
      }
      if (!token) {
        throw new TranscriptionSessionError(
          'ephemeral-token-failed',
          this.provider,
          'The Gemini ephemeral-token endpoint returned an empty token.'
        );
      }
      return { type: 'ephemeral-token', value: token };
    }

    if (this.options.auth.acknowledgeBrowserKeyRisk !== true) {
      throw new TranscriptionSessionError(
        'invalid-configuration',
        this.provider,
        'Browser API-key mode requires explicit risk acknowledgement.'
      );
    }

    let apiKey: string;
    try {
      apiKey = (await this.options.auth.getApiKey()).trim();
    } catch (cause) {
      throw new TranscriptionSessionError(
        'authentication-failed',
        this.provider,
        'The browser API key could not be obtained.',
        { cause }
      );
    }
    if (!apiKey) {
      throw new TranscriptionSessionError(
        'authentication-failed',
        this.provider,
        'An end-user Gemini API key is required for browser BYOK mode.'
      );
    }
    return { type: 'browser-api-key', value: apiKey };
  }

  private createWebSocketUrl(credential: GeminiLiveCredential): string {
    const value = encodeURIComponent(credential.value);
    return credential.type === 'ephemeral-token'
      ? `${EPHEMERAL_TOKEN_WEBSOCKET_URL}?access_token=${value}`
      : `${API_KEY_WEBSOCKET_URL}?key=${value}`;
  }

  private openAndConfigure(
    socket: WebSocket,
    operationId: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let setupSent = false;
      let settled = false;
      let closeGraceTimer: ReturnType<typeof setTimeout> | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const complete = (operation: () => void) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (closeGraceTimer) clearTimeout(closeGraceTimer);
        if (this.connectionCancel === cancel) this.connectionCancel = null;
        operation();
      };
      const cancel = () =>
        complete(() => reject(new SessionOperationCancelled()));
      this.connectionCancel = cancel;
      const scheduleTimeout = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const error = setupSent
            ? new TranscriptionSessionError(
                'provider-error',
                this.provider,
                'The Gemini Live WebSocket opened, but the setup response did not arrive within 10 seconds.'
              )
            : new TranscriptionSessionError(
                'connection-failed',
                this.provider,
                'The Gemini Live WebSocket did not open within 10 seconds.'
              );
          complete(() => reject(error));
        }, CONNECTION_TIMEOUT_MS);
      };
      scheduleTimeout();

      socket.onopen = () => {
        if (operationId !== this.operationId) {
          cancel();
          return;
        }
        setupSent = true;
        scheduleTimeout();
        socket.send(JSON.stringify(createSetupMessage(this.options)));
      };
      socket.onmessage = (event) => {
        void this.parseServerMessage(event.data).then((message) => {
          if (settled || !message) return;
          const providerError = this.providerErrorFromMessage(message);
          if (providerError) {
            complete(() => reject(providerError));
            return;
          }
          if (setupSent && message.setupComplete !== undefined) {
            complete(resolve);
          }
        });
      };
      socket.onerror = () => {
        if (settled || closeGraceTimer) return;
        closeGraceTimer = setTimeout(() => {
          complete(() =>
            reject(
              new TranscriptionSessionError(
                'connection-failed',
                this.provider,
                'The Gemini Live WebSocket connection failed before the browser received close details.'
              )
            )
          );
        }, WEBSOCKET_CLOSE_GRACE_MS);
      };
      socket.onclose = (event) => {
        complete(() => reject(errorFromCloseEvent(event, 'setup')));
      };
    });
  }

  private attachRuntimeListeners(socket: WebSocket): void {
    socket.onopen = null;
    socket.onmessage = (event) => {
      void this.handleServerMessage(event.data);
    };
    socket.onerror = () => this.scheduleSocketErrorFallback(socket);
    socket.onclose = (event) => {
      this.clearSocketErrorFallback();
      if (this.state === 'stopping') {
        this.completeStopFinalization();
        return;
      }
      if (this.state === 'listening') {
        this.handleConnectionFailure(errorFromCloseEvent(event, 'runtime'));
      }
    };
  }

  private scheduleSocketErrorFallback(socket: WebSocket): void {
    if (this.socketErrorFallbackTimer) return;
    this.socketErrorFallbackTimer = setTimeout(() => {
      this.socketErrorFallbackTimer = null;
      if (this.socket !== socket || this.state !== 'listening') return;
      this.handleConnectionFailure(
        new TranscriptionSessionError(
          'connection-failed',
          this.provider,
          'The Gemini Live WebSocket connection failed before the browser received close details.'
        )
      );
    }, WEBSOCKET_CLOSE_GRACE_MS);
  }

  private clearSocketErrorFallback(): void {
    if (!this.socketErrorFallbackTimer) return;
    clearTimeout(this.socketErrorFallbackTimer);
    this.socketErrorFallbackTimer = null;
  }

  private sendAudioChunk(socket: WebSocket, pcm16: Uint8Array): void {
    if (
      (this.state !== 'listening' && this.state !== 'stopping') ||
      socket !== this.socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    socket.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: pcm16BytesToBase64(pcm16),
            mimeType: 'audio/pcm;rate=16000',
          },
        },
      })
    );
  }

  private async handleServerMessage(raw: unknown): Promise<void> {
    const message = await this.parseServerMessage(raw);
    if (!message) return;

    const providerError = this.providerErrorFromMessage(message);
    if (providerError) {
      if (this.state === 'stopping') {
        this.completeStopFinalization();
      } else {
        this.handleConnectionFailure(providerError);
      }
      return;
    }

    const interim = message.serverContent?.interimInputTranscription?.text;
    if (typeof interim === 'string') {
      const utteranceId = this.currentUtteranceId();
      this.emitTranscript({ utteranceId, text: interim, isFinal: false });
    }

    const final = message.serverContent?.inputTranscription?.text;
    if (typeof final === 'string') {
      const utteranceId = this.currentUtteranceId();
      this.activeUtteranceId = null;
      this.emitTranscript({ utteranceId, text: final, isFinal: true });
      this.completeStopFinalization();
    }
  }

  private async parseServerMessage(
    raw: unknown
  ): Promise<GeminiLiveServerMessage | null> {
    try {
      const json =
        typeof raw === 'string'
          ? raw
          : typeof Blob !== 'undefined' && raw instanceof Blob
            ? await raw.text()
            : Object.prototype.toString.call(raw) === '[object ArrayBuffer]'
              ? new TextDecoder().decode(raw as ArrayBuffer)
              : null;
      return json ? (JSON.parse(json) as GeminiLiveServerMessage) : null;
    } catch {
      return null;
    }
  }

  private providerErrorFromMessage(
    message: GeminiLiveServerMessage
  ): TranscriptionError | null {
    if (!message.error) return null;
    const errorText =
      typeof message.error.message === 'string'
        ? message.error.message
        : 'Gemini Live transcription reported an error.';
    const status =
      typeof message.error.status === 'string' ? message.error.status : '';
    const code =
      status === 'UNAUTHENTICATED' || status === 'PERMISSION_DENIED'
        ? 'authentication-failed'
        : 'provider-error';
    return new TranscriptionSessionError(code, this.provider, errorText);
  }

  private currentUtteranceId(): string {
    if (!this.activeUtteranceId) {
      this.activeUtteranceId = `gemini-live:${++this.utteranceSequence}`;
    }
    return this.activeUtteranceId;
  }

  private waitForFinalTranscript(): Promise<void> {
    if (!this.activeUtteranceId) return Promise.resolve();
    const stopFinalization = this.stopFinalization;
    if (stopFinalization) {
      return new Promise((resolve) => {
        const currentResolve = stopFinalization.resolve;
        stopFinalization.resolve = () => {
          currentResolve();
          resolve();
        };
      });
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.stopFinalization?.timer === timer) {
          this.stopFinalization = null;
        }
        resolve();
      }, STOP_FINALIZATION_TIMEOUT_MS);
      this.stopFinalization = { resolve, timer };
    });
  }

  private completeStopFinalization(): void {
    if (!this.stopFinalization) return;
    const { resolve, timer } = this.stopFinalization;
    this.stopFinalization = null;
    clearTimeout(timer);
    resolve();
  }

  private handleConnectionFailure(error: TranscriptionError): void {
    if (this.state === 'disposed' || this.state === 'error') return;
    this.operationId += 1;
    this.changeState('error');
    this.emitError(error);
    const capture = this.capture;
    this.capture = null;
    void capture?.stop().catch(() => undefined);
    this.cleanupResources();
  }

  private cleanupResources(): void {
    this.connectionCancel?.();
    this.connectionCancel = null;
    this.clearSocketErrorFallback();
    this.completeStopFinalization();
    this.activeUtteranceId = null;
    const socket = this.socket;
    this.socket = null;
    this.closeSocket(socket);
    const stream = this.mediaStream;
    this.mediaStream = null;
    for (const track of stream?.getTracks() ?? []) track.stop();
  }

  private closeSocket(socket: WebSocket | null): void {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN
    ) {
      socket.close();
    }
  }

  private assertBrowserSupport(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'Gemini Live transcription requires a browser.'
      );
    }
    if (window.isSecureContext === false) {
      throw new TranscriptionSessionError(
        'insecure-context',
        this.provider,
        'Gemini Live transcription requires HTTPS or localhost.'
      );
    }
    const browser = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    if (
      typeof WebSocket === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !(browser.AudioContext ?? browser.webkitAudioContext) ||
      typeof AudioWorkletNode === 'undefined'
    ) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'This browser does not support the WebSocket and Web Audio microphone APIs required by Gemini Live.'
      );
    }
  }

  private assertOperation(operationId: number): void {
    if (operationId !== this.operationId) {
      throw new SessionOperationCancelled();
    }
    this.assertNotDisposed();
  }
}
