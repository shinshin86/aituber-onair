import { AudioPlayer } from '../types/audioPlayer';
import {
  isSelfPlayingVoiceEngine,
  SelfPlayingVoiceEngine,
  VoiceEngine,
} from '../engines/VoiceEngine';
import { ChatScreenplay } from '../types/chat';
import { Talk } from '../types/voice';
import { textToScreenplay } from '../utils/screenplay';
import { emotionToTalkStyle } from '../utils/emotionParser';
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
  speechPromise: Promise<PreparedSpeech>;
  resolve: () => void;
  reject: (error: unknown) => void;
  completionPromise: Promise<void>;
  cancelled: boolean;
}

type PreparedSpeech =
  | {
      kind: 'audio';
      audioBuffer: ArrayBuffer;
    }
  | {
      kind: 'direct';
      engine: SelfPlayingVoiceEngine;
      talk: Talk;
    };

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
  private activeSelfPlayingEngine?: SelfPlayingVoiceEngine;
  private requestIdCounter = 0;
  private cachedPiperPlusEngine?: VoiceEngine;

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

    const speechPromise = this.prepareSpeechForScreenplay(screenplay);
    // Prevent unhandled rejections; actual handling occurs in processQueue.
    speechPromise.catch(() => {});

    return {
      id,
      screenplay,
      options,
      speechPromise,
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

        let preparedSpeech: PreparedSpeech;
        try {
          preparedSpeech = await request.speechPromise;
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
          await this.playPreparedSpeech(preparedSpeech, request.options);
          request.resolve();
        } catch (error) {
          console.error('Error in speech playback:', error);
          request.reject(error);
        } finally {
          this.activeSelfPlayingEngine = undefined;
          this.activeRequest = undefined;
          this.requestQueue.shift();
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async prepareSpeechForScreenplay(
    screenplay: ChatScreenplay,
  ): Promise<PreparedSpeech> {
    const talk: Talk = {
      style: emotionToTalkStyle(screenplay.emotion),
      message: screenplay.text,
    };

    const engine = await this.getEngine();

    applyOptionsToEngine(engine, this.options);

    if (isSelfPlayingVoiceEngine(engine)) {
      return {
        kind: 'direct',
        engine,
        talk,
      };
    }

    // Get audio data
    const audioBuffer = await engine.fetchAudio(
      talk,
      this.options.speaker ?? '',
      this.options.apiKey,
    );

    return {
      kind: 'audio',
      audioBuffer,
    };
  }

  private async getEngine(): Promise<VoiceEngine> {
    const { VoiceEngineFactory } = await import(
      '../engines/VoiceEngineFactory'
    );

    if (this.options.engineType === 'piperPlus') {
      if (!this.cachedPiperPlusEngine) {
        this.cachedPiperPlusEngine = VoiceEngineFactory.getEngine(
          this.options.engineType,
        );
      }

      return this.cachedPiperPlusEngine;
    }

    return VoiceEngineFactory.getEngine(this.options.engineType);
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

  private async playPreparedSpeech(
    preparedSpeech: PreparedSpeech,
    options?: AudioPlayOptions,
  ): Promise<void> {
    if (preparedSpeech.kind === 'audio') {
      await this.playAudioBuffer(preparedSpeech.audioBuffer, options);
      return;
    }

    this.activeSelfPlayingEngine = preparedSpeech.engine;
    await preparedSpeech.engine.speakDirectly(
      preparedSpeech.talk,
      this.options.speaker ?? '',
    );

    if (this.options.onComplete) {
      this.options.onComplete();
    }
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
    if (this.activeSelfPlayingEngine?.isSpeaking?.()) {
      return true;
    }

    return this.audioPlayer.isPlaying();
  }

  /**
   * Get current service settings
   */
  getOptions(): VoiceServiceOptions {
    return this.options;
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.activeSelfPlayingEngine?.stopSpeaking();
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
    } catch (error) {
      console.warn(
        'Invalid voice options were merged using the legacy lenient updateOptions() path. This fallback is deprecated; use switchEngine() for cross-engine changes.',
        error,
      );
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
    if (
      this.options.engineType === 'piperPlus' &&
      options.engineType !== 'piperPlus'
    ) {
      this.cachedPiperPlusEngine = undefined;
    }

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
