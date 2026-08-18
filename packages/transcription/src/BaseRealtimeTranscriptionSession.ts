import { TranscriptionSessionError } from './errors';
import type {
  RealtimeTranscriptionSession,
  TranscriptUpdate,
  TranscriptionCapabilities,
  TranscriptionError,
  TranscriptionProgress,
  TranscriptionProviderName,
  TranscriptionState,
} from './types';

export abstract class BaseRealtimeTranscriptionSession
  implements RealtimeTranscriptionSession
{
  readonly provider: TranscriptionProviderName;
  readonly capabilities: TranscriptionCapabilities;

  private currentState: TranscriptionState = 'idle';
  private readonly transcriptListeners = new Set<
    (update: TranscriptUpdate) => void
  >();
  private readonly progressListeners = new Set<
    (progress: TranscriptionProgress) => void
  >();
  private readonly stateListeners = new Set<
    (state: TranscriptionState) => void
  >();
  private readonly errorListeners = new Set<
    (error: TranscriptionError) => void
  >();

  protected constructor(
    provider: TranscriptionProviderName,
    capabilities: TranscriptionCapabilities
  ) {
    this.provider = provider;
    this.capabilities = capabilities;
  }

  get state(): TranscriptionState {
    return this.currentState;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract dispose(): Promise<void>;

  onTranscript(listener: (update: TranscriptUpdate) => void): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  onProgress(listener: (progress: TranscriptionProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onStateChange(listener: (state: TranscriptionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onError(listener: (error: TranscriptionError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  protected changeState(state: TranscriptionState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    for (const listener of this.stateListeners) listener(state);
  }

  protected emitTranscript(update: TranscriptUpdate): void {
    if (!update.text) return;
    for (const listener of this.transcriptListeners) listener(update);
  }

  protected emitProgress(progress: TranscriptionProgress): void {
    for (const listener of this.progressListeners) listener(progress);
  }

  protected emitError(error: TranscriptionError): void {
    for (const listener of this.errorListeners) listener(error);
  }

  protected assertNotDisposed(): void {
    if (this.state === 'disposed') {
      throw new TranscriptionSessionError(
        'session-disposed',
        this.provider,
        'The transcription session has been disposed.'
      );
    }
  }

  protected clearListeners(): void {
    this.transcriptListeners.clear();
    this.progressListeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
  }
}
