import { BaseRealtimeTranscriptionSession } from '../BaseRealtimeTranscriptionSession';
import { TranscriptionSessionError } from '../errors';
import type {
  TranscriptionErrorCode,
  WebSpeechTranscriptionOptions,
} from '../types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface SpeechRecognitionWindow {
  isSecureContext?: boolean;
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

const STOP_TIMEOUT_MS = 1000;

function mapRecognitionError(error: string): TranscriptionErrorCode {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'permission-denied';
  }
  if (error === 'no-speech') return 'no-speech';
  return 'provider-error';
}

export class WebSpeechTranscriptionSession extends BaseRealtimeTranscriptionSession {
  private readonly options: WebSpeechTranscriptionOptions;
  private recognition: BrowserSpeechRecognition | null = null;
  private runId = 0;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private resolveStop: (() => void) | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WebSpeechTranscriptionOptions) {
    super('web-speech', {
      interimResults: true,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: false,
    });
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

    this.changeState('connecting');
    await this.startRecognition();
  }

  private async startRecognition(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        throw new TranscriptionSessionError(
          'unsupported-provider',
          this.provider,
          'Web Speech is only available in a browser.'
        );
      }

      const browser = window as unknown as SpeechRecognitionWindow;
      if (browser.isSecureContext === false) {
        throw new TranscriptionSessionError(
          'insecure-context',
          this.provider,
          'Speech recognition requires HTTPS or localhost.'
        );
      }

      const Recognition =
        browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
      if (!Recognition) {
        throw new TranscriptionSessionError(
          'unsupported-provider',
          this.provider,
          'This browser does not support the Web Speech recognition API.'
        );
      }

      const recognition = new Recognition();
      recognition.lang = this.options.language;
      recognition.interimResults = true;
      recognition.continuous = this.options.continuous ?? true;
      this.runId += 1;
      const currentRunId = this.runId;

      recognition.onresult = (event) => {
        for (
          let index = event.resultIndex;
          index < event.results.length;
          index++
        ) {
          const result = event.results[index];
          const text = result?.[0]?.transcript ?? '';
          this.emitTranscript({
            utteranceId: `web-speech:${currentRunId}:${index}`,
            text,
            isFinal: result?.isFinal ?? false,
          });
        }
      };
      recognition.onerror = (event) => {
        const error = new TranscriptionSessionError(
          mapRecognitionError(event.error),
          this.provider,
          `Web Speech recognition failed: ${event.error}.`
        );
        this.emitError(error);
        this.finishRecognition('error', true);
      };
      recognition.onend = () => {
        this.finishRecognition(
          this.state === 'disposed' ? 'disposed' : 'idle',
          false
        );
      };

      this.recognition = recognition;
      recognition.start();
      this.changeState('listening');
    } catch (cause) {
      const error =
        cause instanceof TranscriptionSessionError
          ? cause
          : new TranscriptionSessionError(
              'provider-error',
              this.provider,
              'Web Speech recognition could not start.',
              { cause }
            );
      this.finishRecognition('error', true);
      this.emitError(error);
      throw error;
    }
  }

  stop(): Promise<void> {
    if (this.state === 'disposed' || this.state === 'idle') {
      return Promise.resolve();
    }
    if (this.stopPromise) return this.stopPromise;
    if (!this.recognition) {
      this.changeState('idle');
      return Promise.resolve();
    }

    this.changeState('stopping');
    const promise = new Promise<void>((resolve) => {
      this.resolveStop = resolve;
      this.stopTimer = setTimeout(() => {
        this.finishRecognition('idle', true);
      }, STOP_TIMEOUT_MS);
      try {
        this.recognition?.stop();
      } catch {
        this.finishRecognition('idle', true);
      }
    });
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

  async dispose(): Promise<void> {
    if (this.state === 'disposed') return;
    this.runId += 1;
    this.finishRecognition('disposed', true);
    this.clearListeners();
  }

  private finishRecognition(
    nextState: 'idle' | 'error' | 'disposed',
    abort: boolean
  ): void {
    const recognition = this.recognition;
    this.recognition = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (abort) {
        try {
          recognition.abort();
        } catch {
          // The browser may already have released the recognition object.
        }
      }
    }
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.resolveStop?.();
    this.resolveStop = null;
    this.changeState(nextState);
  }
}
