import { AudioPlayer } from '../types/audioPlayer';
import { VoiceEngine } from '../engines/VoiceEngine';
import { ChatScreenplay } from '../types/chat';
import { Talk, TalkStyle } from '../types/voice';
import { textToScreenplay } from '../utils/screenplay';
import {
  AudioPlayOptions,
  VoiceService,
  VoiceServiceOptions,
  VoiceServiceOptionsUpdate,
} from './VoiceService';
import {
  applyOptionsToEngine,
  getAllowedUpdateKeys,
  mergeOptionsForEngine,
} from './internal/engineHandlers';
import { AudioPlayerFactory } from './audio/AudioPlayerFactory';

interface SpeechRequest {
  id: number;
  screenplay: ChatScreenplay;
  options?: AudioPlayOptions;
  audioPromise: Promise<ArrayBuffer>;
  resolve: () => void;
  reject: (error: unknown) => void;
  completionPromise: Promise<void>;
  cancelled: boolean;
}

const COMMON_UPDATE_KEYS = [
  'speaker',
  'apiKey',
  'onPlay',
  'onComplete',
] as const;

/**
 * Adapter implementation for using existing voice engines
 */
export class VoiceEngineAdapter implements VoiceService {
  private options: VoiceServiceOptions;
  private audioPlayer: AudioPlayer;
  private requestQueue: SpeechRequest[] = [];
  private isProcessingQueue = false;
  private activeRequest?: SpeechRequest;
  private requestIdCounter = 0;

  /**
   * Constructor
   * @param options Voice service options
   */
  constructor(options: VoiceServiceOptions) {
    this.options = options;
    this.audioPlayer = AudioPlayerFactory.createAudioPlayer();
    this.bindOnCompleteCallback();
  }

  private bindOnCompleteCallback(): void {
    this.audioPlayer.setOnComplete(() => {
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    });
  }

  /**
   * Speak the screenplay as audio
   * @param screenplay Screenplay (text and emotion)
   * @param options Audio playback options
   */
  async speak(
    screenplay: ChatScreenplay,
    options?: AudioPlayOptions,
  ): Promise<void> {
    const request = this.createSpeechRequest(screenplay, options);
    this.requestQueue.push(request);
    void this.processQueue();
    return request.completionPromise;
  }

  private createSpeechRequest(
    screenplay: ChatScreenplay,
    options?: AudioPlayOptions,
  ): SpeechRequest {
    const id = ++this.requestIdCounter;
    let resolveInner: () => void = () => {};
    let rejectInner: (error: unknown) => void = () => {};

    let settled = false;

    const completionPromise = new Promise<void>((resolve, reject) => {
      resolveInner = resolve;
      rejectInner = reject;
    });

    const resolveFn = () => {
      if (settled) return;
      settled = true;
      resolveInner();
    };

    const rejectFn = (error: unknown) => {
      if (settled) return;
      settled = true;
      rejectInner(error);
    };

    const audioPromise = this.fetchAudioForScreenplay(screenplay);
    // Prevent unhandled rejections; actual handling occurs in processQueue.
    audioPromise.catch(() => {});

    return {
      id,
      screenplay,
      options,
      audioPromise,
      resolve: resolveFn,
      reject: rejectFn,
      completionPromise,
      cancelled: false,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue[0];

        let audioBuffer: ArrayBuffer;
        try {
          audioBuffer = await request.audioPromise;
        } catch (error) {
          console.error('Error fetching audio for speech:', error);
          request.reject(error);
          this.requestQueue.shift();
          continue;
        }

        if (request.cancelled) {
          this.requestQueue.shift();
          continue;
        }

        try {
          this.activeRequest = request;
          await this.playAudioBuffer(audioBuffer, request.options);
          request.resolve();
        } catch (error) {
          console.error('Error in speech playback:', error);
          request.reject(error);
        } finally {
          this.activeRequest = undefined;
          this.requestQueue.shift();
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private mapEmotionToStyle(emotion?: string): TalkStyle {
    switch ((emotion || 'neutral').toLowerCase()) {
      case 'angry':
        return 'angry';
      case 'happy':
        return 'happy';
      case 'sad':
        return 'sad';
      case 'surprised':
        return 'surprised';
      default:
        return 'neutral';
    }
  }

  private async fetchAudioForScreenplay(
    screenplay: ChatScreenplay,
  ): Promise<ArrayBuffer> {
    // Import existing VoiceEngineFactory dynamically
    const { VoiceEngineFactory } = await import(
      '../engines/VoiceEngineFactory'
    );

    const talk: Talk = {
      style: this.mapEmotionToStyle(screenplay.emotion),
      message: screenplay.text,
    };

    const engine = VoiceEngineFactory.getEngine(this.options.engineType);

    applyOptionsToEngine(engine, this.options);

    // Get audio data
    return await engine.fetchAudio(
      talk,
      this.options.speaker,
      this.options.apiKey,
    );
  }

  private async playAudioBuffer(
    audioBuffer: ArrayBuffer,
    options?: AudioPlayOptions,
  ): Promise<void> {
    if (this.options.onPlay) {
      await this.options.onPlay(audioBuffer, options);
      return;
    }

    await this.audioPlayer.play(audioBuffer, options?.audioElementId);
  }

  /**
   * Speak text as audio
   * @param text Text (with emotion tags) to speak
   * @param options Audio playback options
   */
  async speakText(text: string, options?: AudioPlayOptions): Promise<void> {
    // Convert text to screenplay and play
    const screenplay = textToScreenplay(text);
    return this.speak(screenplay, options);
  }

  /**
   * Get whether currently playing
   */
  isPlaying(): boolean {
    return this.audioPlayer.isPlaying();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.audioPlayer.stop();

    const stopError = new Error('Speech playback stopped');

    if (this.activeRequest) {
      this.activeRequest.cancelled = true;
      this.activeRequest.reject(stopError);
    }

    for (const request of this.requestQueue) {
      request.cancelled = true;
      request.reject(stopError);
    }

    this.requestQueue = [];
  }

  /**
   * Update service settings
   * @param options New settings options
   */
  updateOptions(
    options: VoiceServiceOptionsUpdate | Partial<VoiceServiceOptions>,
  ): void {
    // Backward compatible path: allow engine switching via updateOptions().
    if (Object.prototype.hasOwnProperty.call(options, 'engineType')) {
      this.switchEngine({
        ...this.options,
        ...(options as Partial<VoiceServiceOptions>),
      } as VoiceServiceOptions);
      return;
    }

    try {
      this.validateUpdateOptions(options as VoiceServiceOptionsUpdate);
      this.mergeOptionsForCurrentEngine(options as VoiceServiceOptionsUpdate);
    } catch {
      // Backward compatible path: accept cross-engine fields without throwing.
      this.options = {
        ...this.options,
        ...(options as Partial<VoiceServiceOptions>),
      } as VoiceServiceOptions;
    }

    // Update audio player callback if onComplete changes
    if (options.onComplete !== undefined) {
      this.bindOnCompleteCallback();
    }
  }

  /**
   * Switch voice engine with complete options for the target engine
   * @param options New engine options
   */
  switchEngine(options: VoiceServiceOptions): void {
    this.options = options;
    this.bindOnCompleteCallback();
  }

  private validateUpdateOptions(options: VoiceServiceOptionsUpdate): void {
    if (Object.prototype.hasOwnProperty.call(options, 'engineType')) {
      throw new Error(
        'engineType cannot be updated via updateOptions(). Use switchEngine() instead.',
      );
    }

    const allowedKeys = new Set<string>([
      ...COMMON_UPDATE_KEYS,
      ...getAllowedUpdateKeys(this.options.engineType),
    ]);
    const invalidKeys = Object.keys(options).filter(
      (key) => !allowedKeys.has(key),
    );

    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid update options for engine "${this.options.engineType}": ${invalidKeys.join(
          ', ',
        )}. Use switchEngine() for cross-engine changes.`,
      );
    }
  }

  private mergeOptionsForCurrentEngine(
    options: VoiceServiceOptionsUpdate,
  ): void {
    this.options = mergeOptionsForEngine(this.options, options);
  }
}
