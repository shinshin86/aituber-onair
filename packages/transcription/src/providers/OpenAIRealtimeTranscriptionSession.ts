import { BaseRealtimeTranscriptionSession } from '../BaseRealtimeTranscriptionSession';
import { TranscriptionSessionError } from '../errors';
import type {
  OpenAIRealtimeTranscriptionOptions,
  TranscriptionError,
} from '../types';

const CLIENT_SECRET_URL = 'https://api.openai.com/v1/realtime/client_secrets';
const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const OPENAI_TRANSCRIPTION_MODEL = 'gpt-live-transcribe';
const CLIENT_SECRET_TTL_SECONDS = 600;
const DATA_CHANNEL_OPEN_TIMEOUT_MS = 10_000;
const STOP_FINALIZATION_TIMEOUT_MS = 10_000;

interface ClientSecretResponse {
  value?: unknown;
}

interface RealtimeEvent {
  type?: unknown;
  item_id?: unknown;
  delta?: unknown;
  transcript?: unknown;
  session?: unknown;
  error?: {
    message?: unknown;
    event_id?: unknown;
  };
}

interface StopFinalization {
  phase:
    | 'waiting-for-vad-disabled'
    | 'waiting-for-commit'
    | 'waiting-for-transcripts';
  vadUpdateEventId: string;
  commitEventId: string;
  dataChannel: RTCDataChannel;
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

class SessionOperationCancelled extends Error {}

function isPermissionDenied(cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
  );
}

function hasDisabledTurnDetection(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const audio = Reflect.get(session, 'audio');
  if (!audio || typeof audio !== 'object') return false;
  const input = Reflect.get(audio, 'input');
  if (!input || typeof input !== 'object') return false;
  return Reflect.get(input, 'turn_detection') === null;
}

function createSessionConfiguration(
  options: OpenAIRealtimeTranscriptionOptions
): Record<string, unknown> {
  const transcription: Record<string, unknown> = {
    model: OPENAI_TRANSCRIPTION_MODEL,
  };
  if (options.languages?.length) {
    transcription.languages = [...options.languages];
  }
  if (options.keywords?.length) {
    transcription.keywords = [...options.keywords];
  }
  if (options.prompt?.trim()) transcription.prompt = options.prompt.trim();
  if (options.delay) transcription.delay = options.delay;

  return {
    type: 'transcription',
    audio: {
      input: {
        transcription,
        turn_detection: {
          type: 'server_vad',
        },
      },
    },
  };
}

function validateContextOptions(
  options: OpenAIRealtimeTranscriptionOptions
): void {
  for (const keyword of options.keywords ?? []) {
    if (/[<>\r\n]/.test(keyword)) {
      throw new TranscriptionSessionError(
        'invalid-configuration',
        'openai-realtime',
        'OpenAI transcription keywords cannot contain <, >, or line breaks.'
      );
    }
  }
  if (options.languages?.some((language) => !language.trim())) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'openai-realtime',
      'OpenAI transcription language codes cannot be empty.'
    );
  }
}

export class OpenAIRealtimeTranscriptionSession extends BaseRealtimeTranscriptionSession {
  private readonly options: OpenAIRealtimeTranscriptionOptions;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private operationId = 0;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private readonly transcripts = new Map<string, string>();
  private readonly pendingTranscriptItemIds = new Set<string>();
  private stopFinalization: StopFinalization | null = null;

  constructor(options: OpenAIRealtimeTranscriptionOptions) {
    super('openai-realtime', {
      interimResults: true,
      multipleLanguages: true,
      keywords: true,
      configurableDelay: true,
    });
    validateContextOptions(options);
    this.options = options;
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
    let localPeerConnection: RTCPeerConnection | null = null;
    let localDataChannel: RTCDataChannel | null = null;

    try {
      this.assertBrowserSupport();
      const clientSecret = await this.getClientSecret();
      this.assertOperation(operationId);

      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.assertOperation(operationId);

      localPeerConnection = new RTCPeerConnection();
      for (const track of localStream.getAudioTracks()) {
        localPeerConnection.addTrack(track, localStream);
      }
      localDataChannel = localPeerConnection.createDataChannel('oai-events');

      this.mediaStream = localStream;
      this.peerConnection = localPeerConnection;
      this.dataChannel = localDataChannel;

      const offer = await localPeerConnection.createOffer();
      await localPeerConnection.setLocalDescription(offer);
      this.assertOperation(operationId);

      const response = await fetch(REALTIME_CALLS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      if (!response.ok) {
        const code =
          response.status === 401 || response.status === 403
            ? 'authentication-failed'
            : 'connection-failed';
        throw new TranscriptionSessionError(
          code,
          this.provider,
          `OpenAI Realtime connection failed (HTTP ${response.status}).`
        );
      }

      const answerSdp = await response.text();
      this.assertOperation(operationId);
      await localPeerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });
      await this.waitForDataChannel(
        localDataChannel,
        localPeerConnection,
        operationId
      );
      this.assertOperation(operationId);
      this.attachConnectionListeners(localPeerConnection, localDataChannel);

      localDataChannel.send(
        JSON.stringify({
          type: 'session.update',
          session: createSessionConfiguration(this.options),
        })
      );
      this.changeState('listening');
    } catch (cause) {
      this.releaseLocalResources(
        localStream,
        localPeerConnection,
        localDataChannel
      );
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

      const error = this.normalizeStartError(cause);
      this.cleanupResources();
      this.changeState('error');
      this.emitError(error);
      throw error;
    }
  }

  private assertBrowserSupport(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'OpenAI Realtime transcription requires a browser.'
      );
    }
    if (window.isSecureContext === false) {
      throw new TranscriptionSessionError(
        'insecure-context',
        this.provider,
        'OpenAI Realtime transcription requires HTTPS or localhost.'
      );
    }
    if (
      typeof RTCPeerConnection === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new TranscriptionSessionError(
        'unsupported-provider',
        this.provider,
        'This browser does not support the required WebRTC microphone APIs.'
      );
    }
  }

  private async getClientSecret(): Promise<string> {
    if (this.options.auth.type === 'client-secret') {
      try {
        const secret = (await this.options.auth.getClientSecret()).trim();
        if (!secret) throw new Error('Empty client secret');
        return secret;
      } catch (cause) {
        throw new TranscriptionSessionError(
          'client-secret-failed',
          this.provider,
          'The OpenAI Realtime client-secret endpoint was unavailable.',
          { cause }
        );
      }
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
        'An end-user OpenAI API key is required for browser BYOK mode.'
      );
    }

    let response: Response;
    try {
      response = await fetch(CLIENT_SECRET_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: {
            anchor: 'created_at',
            seconds: CLIENT_SECRET_TTL_SECONDS,
          },
          session: createSessionConfiguration(this.options),
        }),
      });
    } catch (cause) {
      throw new TranscriptionSessionError(
        'client-secret-failed',
        this.provider,
        'The browser could not mint an OpenAI Realtime client secret.',
        { cause }
      );
    }

    if (!response.ok) {
      const code =
        response.status === 401 || response.status === 403
          ? 'authentication-failed'
          : 'client-secret-failed';
      throw new TranscriptionSessionError(
        code,
        this.provider,
        `OpenAI client-secret creation failed (HTTP ${response.status}).`
      );
    }

    let payload: ClientSecretResponse;
    try {
      payload = (await response.json()) as ClientSecretResponse;
    } catch (cause) {
      throw new TranscriptionSessionError(
        'client-secret-failed',
        this.provider,
        'OpenAI returned an invalid client-secret response.',
        { cause }
      );
    }
    if (typeof payload.value !== 'string' || !payload.value.trim()) {
      throw new TranscriptionSessionError(
        'client-secret-failed',
        this.provider,
        'OpenAI returned an empty Realtime client secret.'
      );
    }
    return payload.value.trim();
  }

  private attachConnectionListeners(
    peerConnection: RTCPeerConnection,
    dataChannel: RTCDataChannel
  ): void {
    dataChannel.onmessage = (event) => this.handleRealtimeMessage(event.data);
    dataChannel.onclose = () => {
      if (this.state === 'stopping') {
        this.completeStopFinalization();
        return;
      }
      if (this.state === 'listening') {
        this.handleConnectionFailure(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            'The OpenAI Realtime data channel closed unexpectedly.'
          )
        );
      }
    };
    peerConnection.onconnectionstatechange = () => {
      if (
        this.state === 'stopping' &&
        (peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed')
      ) {
        this.completeStopFinalization();
        return;
      }
      if (
        this.state === 'listening' &&
        peerConnection.connectionState === 'failed'
      ) {
        this.handleConnectionFailure(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            'The OpenAI Realtime peer connection failed.'
          )
        );
      }
    };
  }

  private handleRealtimeMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }

    if (
      event.type === 'conversation.item.input_audio_transcription.delta' &&
      typeof event.item_id === 'string' &&
      typeof event.delta === 'string'
    ) {
      this.pendingTranscriptItemIds.add(event.item_id);
      const text = (this.transcripts.get(event.item_id) ?? '') + event.delta;
      this.transcripts.set(event.item_id, text);
      this.emitTranscript({
        utteranceId: event.item_id,
        text,
        isFinal: false,
      });
      return;
    }

    if (
      event.type === 'session.updated' &&
      this.stopFinalization?.phase === 'waiting-for-vad-disabled' &&
      hasDisabledTurnDetection(event.session)
    ) {
      this.sendStopCommit();
      return;
    }

    if (
      event.type === 'input_audio_buffer.committed' &&
      typeof event.item_id === 'string'
    ) {
      this.pendingTranscriptItemIds.add(event.item_id);
      if (this.stopFinalization?.phase === 'waiting-for-commit') {
        this.stopFinalization.phase = 'waiting-for-transcripts';
        this.maybeCompleteStopFinalization();
      }
      return;
    }

    if (
      event.type === 'conversation.item.input_audio_transcription.completed' &&
      typeof event.item_id === 'string'
    ) {
      this.transcripts.delete(event.item_id);
      this.pendingTranscriptItemIds.delete(event.item_id);
      if (typeof event.transcript === 'string') {
        this.emitTranscript({
          utteranceId: event.item_id,
          text: event.transcript,
          isFinal: true,
        });
      }
      this.maybeCompleteStopFinalization();
      return;
    }

    if (event.type === 'conversation.item.input_audio_transcription.failed') {
      if (typeof event.item_id === 'string') {
        this.transcripts.delete(event.item_id);
        this.pendingTranscriptItemIds.delete(event.item_id);
      }
      this.maybeCompleteStopFinalization();
      if (this.state === 'stopping') return;

      const message =
        typeof event.error?.message === 'string'
          ? event.error.message
          : 'OpenAI Realtime transcription reported an error.';
      this.handleConnectionFailure(
        new TranscriptionSessionError('provider-error', this.provider, message)
      );
      return;
    }

    if (event.type === 'error') {
      if (this.state === 'stopping') {
        const finalization = this.stopFinalization;
        const sourceEventId = event.error?.event_id;
        if (
          finalization?.phase === 'waiting-for-vad-disabled' &&
          sourceEventId === finalization.vadUpdateEventId
        ) {
          // A commit cannot be correlated safely while server VAD may remain
          // active. Keep the bounded finalization timer as the fallback.
        } else if (
          finalization?.phase === 'waiting-for-commit' &&
          sourceEventId === finalization.commitEventId
        ) {
          finalization.phase = 'waiting-for-transcripts';
          this.maybeCompleteStopFinalization();
        }
        return;
      }

      const message =
        typeof event.error?.message === 'string'
          ? event.error.message
          : 'OpenAI Realtime transcription reported an error.';
      this.handleConnectionFailure(
        new TranscriptionSessionError('provider-error', this.provider, message)
      );
    }
  }

  private handleConnectionFailure(error: TranscriptionError): void {
    if (this.state === 'disposed' || this.state === 'stopping') return;
    this.operationId += 1;
    this.cleanupResources();
    this.changeState('error');
    this.emitError(error);
  }

  private waitForDataChannel(
    dataChannel: RTCDataChannel,
    peerConnection: RTCPeerConnection,
    operationId: number
  ): Promise<void> {
    if (dataChannel.readyState === 'open') return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            'Timed out while opening the OpenAI Realtime data channel.'
          )
        );
      }, DATA_CHANNEL_OPEN_TIMEOUT_MS);
      const handleOpen = () => {
        cleanup();
        try {
          this.assertOperation(operationId);
          resolve();
        } catch (cause) {
          reject(cause);
        }
      };
      const handleError = () => {
        cleanup();
        reject(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            'The OpenAI Realtime data channel failed to open.'
          )
        );
      };
      const handleClose = () => {
        cleanup();
        reject(
          new TranscriptionSessionError(
            'connection-failed',
            this.provider,
            'The OpenAI Realtime data channel closed before opening.'
          )
        );
      };
      const handleConnectionStateChange = () => {
        if (
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed'
        ) {
          handleClose();
        }
      };
      const cleanup = () => {
        clearTimeout(timeout);
        dataChannel.removeEventListener('open', handleOpen);
        dataChannel.removeEventListener('error', handleError);
        dataChannel.removeEventListener('close', handleClose);
        peerConnection.removeEventListener(
          'connectionstatechange',
          handleConnectionStateChange
        );
      };
      dataChannel.addEventListener('open', handleOpen);
      dataChannel.addEventListener('error', handleError);
      dataChannel.addEventListener('close', handleClose);
      peerConnection.addEventListener(
        'connectionstatechange',
        handleConnectionStateChange
      );

      if (dataChannel.readyState === 'closed') handleClose();
      else handleConnectionStateChange();
    });
  }

  stop(): Promise<void> {
    if (this.state === 'disposed' || this.state === 'idle') {
      return Promise.resolve();
    }
    if (this.stopPromise) return this.stopPromise;

    this.operationId += 1;
    this.startPromise = null;
    this.changeState('stopping');
    const promise = this.stopAndRelease();
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

  private async stopAndRelease(): Promise<void> {
    for (const track of this.mediaStream?.getTracks() ?? []) track.stop();

    if (this.dataChannel?.readyState === 'open') {
      try {
        const finalization = this.beginStopFinalization(this.dataChannel);
        await finalization;
      } catch {
        // Cleanup remains safe if the channel closes before the final commit.
      }
    }

    this.cleanupResources();
    if (this.state !== 'disposed') this.changeState('idle');
  }

  private beginStopFinalization(dataChannel: RTCDataChannel): Promise<void> {
    this.completeStopFinalization();

    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.completeStopFinalization();
      }, STOP_FINALIZATION_TIMEOUT_MS);
      const eventIdSuffix = String(this.operationId);
      this.stopFinalization = {
        phase: 'waiting-for-vad-disabled',
        vadUpdateEventId: `transcription-stop-vad-${eventIdSuffix}`,
        commitEventId: `transcription-stop-commit-${eventIdSuffix}`,
        dataChannel,
        resolve,
        timer,
      };
      dataChannel.send(
        JSON.stringify({
          type: 'session.update',
          event_id: this.stopFinalization.vadUpdateEventId,
          session: {
            type: 'transcription',
            audio: {
              input: {
                turn_detection: null,
              },
            },
          },
        })
      );
    });
  }

  private sendStopCommit(): void {
    const finalization = this.stopFinalization;
    if (!finalization) return;
    if (finalization.dataChannel.readyState !== 'open') {
      this.completeStopFinalization();
      return;
    }

    finalization.phase = 'waiting-for-commit';
    try {
      finalization.dataChannel.send(
        JSON.stringify({
          type: 'input_audio_buffer.commit',
          event_id: finalization.commitEventId,
        })
      );
    } catch {
      this.completeStopFinalization();
    }
  }

  private maybeCompleteStopFinalization(): void {
    if (
      this.stopFinalization &&
      this.stopFinalization.phase === 'waiting-for-transcripts' &&
      this.pendingTranscriptItemIds.size === 0
    ) {
      this.completeStopFinalization();
    }
  }

  private completeStopFinalization(): void {
    const finalization = this.stopFinalization;
    if (!finalization) return;
    this.stopFinalization = null;
    clearTimeout(finalization.timer);
    finalization.resolve();
  }

  async dispose(): Promise<void> {
    if (this.state === 'disposed') return;
    this.operationId += 1;
    this.cleanupResources();
    this.changeState('disposed');
    this.clearListeners();
  }

  private assertOperation(operationId: number): void {
    if (operationId !== this.operationId || this.state === 'disposed') {
      throw new SessionOperationCancelled();
    }
  }

  private normalizeStartError(cause: unknown): TranscriptionError {
    if (cause instanceof TranscriptionSessionError) return cause;
    if (isPermissionDenied(cause)) {
      return new TranscriptionSessionError(
        'permission-denied',
        this.provider,
        'Microphone permission was denied.',
        { cause }
      );
    }
    return new TranscriptionSessionError(
      'connection-failed',
      this.provider,
      'OpenAI Realtime transcription could not start.',
      { cause }
    );
  }

  private releaseLocalResources(
    stream: MediaStream | null,
    peerConnection: RTCPeerConnection | null,
    dataChannel: RTCDataChannel | null
  ): void {
    if (stream && stream !== this.mediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (dataChannel && dataChannel !== this.dataChannel) dataChannel.close();
    if (peerConnection && peerConnection !== this.peerConnection) {
      peerConnection.close();
    }
  }

  private cleanupResources(): void {
    this.completeStopFinalization();

    const dataChannel = this.dataChannel;
    this.dataChannel = null;
    if (dataChannel) {
      dataChannel.onmessage = null;
      dataChannel.onclose = null;
      if (dataChannel.readyState !== 'closed') dataChannel.close();
    }

    const peerConnection = this.peerConnection;
    this.peerConnection = null;
    if (peerConnection) {
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }

    const mediaStream = this.mediaStream;
    this.mediaStream = null;
    for (const track of mediaStream?.getTracks() ?? []) track.stop();
    this.transcripts.clear();
    this.pendingTranscriptItemIds.clear();
  }
}
