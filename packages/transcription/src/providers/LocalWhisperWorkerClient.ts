import type {
  LocalWhisperWorkerRequest,
  LocalWhisperWorkerResponse,
} from './localWhisperProtocol';
import type { LocalWhisperModelSize, TranscriptionProgress } from '../types';

interface PendingRequest {
  resolve: (text: string) => void;
  reject: (cause: Error) => void;
}

interface PendingLoad {
  promise: Promise<void>;
  resolve: () => void;
  reject: (cause: Error) => void;
}

interface DebugGlobal {
  __AITUBER_TRANSCRIPTION_DEBUG__?: boolean;
}

function isDebugEnabled(): boolean {
  return (globalThis as DebugGlobal).__AITUBER_TRANSCRIPTION_DEBUG__ === true;
}

function defaultWorkerUrl(): URL {
  return new URL(
    /* @vite-ignore */ './local-whisper.worker.js',
    import.meta.url
  );
}

export interface LocalWhisperTranscriptionInput {
  audio: Float32Array;
  model: LocalWhisperModelSize;
  language?: string;
}

export class LocalWhisperWorkerClient {
  private readonly worker: Worker;
  private readonly pendingLoads = new Map<LocalWhisperModelSize, PendingLoad>();
  private inferenceQueue = Promise.resolve();
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly progressListeners = new Set<
    (progress: TranscriptionProgress) => void
  >();
  private requestSequence = 0;
  private workerFailure: Error | null = null;
  private disposed = false;

  constructor(workerUrl: string | URL = defaultWorkerUrl()) {
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      this.handleMessage(event.data);
    };
    this.worker.onerror = (event: ErrorEvent) => {
      this.failWorker(
        new Error(event.message || 'The local Whisper worker failed.')
      );
    };
  }

  get hasFailed(): boolean {
    return this.workerFailure !== null;
  }

  onProgress(listener: (progress: TranscriptionProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  load(model: LocalWhisperModelSize): Promise<void> {
    this.assertUsable();
    const current = this.pendingLoads.get(model);
    if (current) return current.promise;

    let resolveLoad!: () => void;
    let rejectLoad!: (cause: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
    this.pendingLoads.set(model, {
      promise,
      resolve: resolveLoad,
      reject: rejectLoad,
    });
    try {
      this.postMessage({
        type: 'load',
        model,
        ...(isDebugEnabled() ? { debug: true } : {}),
      });
    } catch (cause) {
      this.failWorker(
        cause instanceof Error ? cause : new Error(String(cause))
      );
    }
    return promise;
  }

  transcribe(input: LocalWhisperTranscriptionInput): Promise<string> {
    const operation = this.inferenceQueue.then(async () => {
      await this.load(input.model);
      this.assertUsable();
      return this.sendTranscriptionRequest(input);
    });
    this.inferenceQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.terminate();
    this.rejectAll(new Error('The local Whisper worker was disposed.'));
    this.progressListeners.clear();
  }

  private sendTranscriptionRequest(
    input: LocalWhisperTranscriptionInput
  ): Promise<string> {
    const requestId = `local-whisper-${++this.requestSequence}`;
    return new Promise<string>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      const request: LocalWhisperWorkerRequest = {
        type: 'transcribe',
        requestId,
        audio: input.audio,
        model: input.model,
        ...(input.language ? { language: input.language } : {}),
        ...(isDebugEnabled() ? { debug: true } : {}),
      };
      try {
        this.postMessage(request, [input.audio.buffer as ArrayBuffer]);
      } catch (cause) {
        this.pendingRequests.delete(requestId);
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
  }

  private postMessage(
    request: LocalWhisperWorkerRequest,
    transfer: Transferable[] = []
  ): void {
    this.worker.postMessage(request, transfer);
  }

  private handleMessage(data: unknown): void {
    if (!this.isWorkerResponse(data)) return;

    if (data.type === 'ready') {
      this.pendingLoads.get(data.model)?.resolve();
      return;
    }
    if (data.type === 'progress') {
      for (const listener of this.progressListeners) {
        listener(data.progress);
      }
      return;
    }

    if (data.type === 'result') {
      const pending = this.pendingRequests.get(data.requestId);
      if (!pending) return;
      this.pendingRequests.delete(data.requestId);
      pending.resolve(data.text);
      return;
    }

    const error = new Error(data.message);
    if (data.requestId) {
      const pending = this.pendingRequests.get(data.requestId);
      if (!pending) return;
      this.pendingRequests.delete(data.requestId);
      pending.reject(error);
      return;
    }
    if (data.model) {
      this.pendingLoads.get(data.model)?.reject(error);
      return;
    }
    this.failWorker(error);
  }

  private isWorkerResponse(data: unknown): data is LocalWhisperWorkerResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      typeof data.type === 'string'
    );
  }

  private failWorker(error: Error): void {
    this.workerFailure = error;
    this.rejectAll(error);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pendingLoads.values()) pending.reject(error);
    for (const pending of this.pendingRequests.values()) pending.reject(error);
    this.pendingRequests.clear();
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('The local Whisper worker was disposed.');
    }
    if (this.workerFailure) throw this.workerFailure;
  }
}
