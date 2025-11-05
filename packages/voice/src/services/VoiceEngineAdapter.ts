import { AudioPlayer } from '../types/audioPlayer';
import { ChatScreenplay } from '../types/chat';
import { EmotionType } from '../types/voice';
import { textToScreenplay } from '../utils/screenplay';
import {
  AudioPlayOptions,
  VoiceService,
  VoiceServiceOptions,
} from './VoiceService';
import { AudioPlayerFactory } from './audio/AudioPlayerFactory';
import { VoiceEngine } from '../engines/VoiceEngine';

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

    // Set up completion callback
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

  private mapEmotionToStyle(emotion?: string): EmotionType {
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

    const talk = {
      style: this.mapEmotionToStyle(screenplay.emotion),
      message: screenplay.text,
    };

    const engine = VoiceEngineFactory.getEngine(this.options.engineType);

    this.applyEngineOverrides(engine);

    // Get audio data
    return await engine.fetchAudio(
      talk as any,
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

  private applyEngineOverrides(engine: VoiceEngine): void {
    if (engine.setApiEndpoint) {
      switch (this.options.engineType) {
        case 'voicevox':
          if (this.options.voicevoxApiUrl) {
            engine.setApiEndpoint(this.options.voicevoxApiUrl);
          }
          break;
        case 'voicepeak':
          if (this.options.voicepeakApiUrl) {
            engine.setApiEndpoint(this.options.voicepeakApiUrl);
          }
          break;
        case 'aivisSpeech':
          if (this.options.aivisSpeechApiUrl) {
            engine.setApiEndpoint(this.options.aivisSpeechApiUrl);
          }
          break;
      }
    }

    if (this.options.engineType === 'voicevox') {
      const voicevoxEngine = engine as any;

      if (
        this.options.voicevoxQueryParameters &&
        typeof voicevoxEngine.setQueryParameters === 'function'
      ) {
        voicevoxEngine.setQueryParameters(this.options.voicevoxQueryParameters);
      }

      if (
        this.options.voicevoxSpeedScale !== undefined &&
        typeof voicevoxEngine.setSpeedScale === 'function'
      ) {
        voicevoxEngine.setSpeedScale(this.options.voicevoxSpeedScale);
      }

      if (
        this.options.voicevoxPitchScale !== undefined &&
        typeof voicevoxEngine.setPitchScale === 'function'
      ) {
        voicevoxEngine.setPitchScale(this.options.voicevoxPitchScale);
      }

      if (
        this.options.voicevoxIntonationScale !== undefined &&
        typeof voicevoxEngine.setIntonationScale === 'function'
      ) {
        voicevoxEngine.setIntonationScale(this.options.voicevoxIntonationScale);
      }

      if (
        this.options.voicevoxVolumeScale !== undefined &&
        typeof voicevoxEngine.setVolumeScale === 'function'
      ) {
        voicevoxEngine.setVolumeScale(this.options.voicevoxVolumeScale);
      }

      if (
        this.options.voicevoxPrePhonemeLength !== undefined &&
        typeof voicevoxEngine.setPrePhonemeLength === 'function'
      ) {
        voicevoxEngine.setPrePhonemeLength(
          this.options.voicevoxPrePhonemeLength,
        );
      }

      if (
        this.options.voicevoxPostPhonemeLength !== undefined &&
        typeof voicevoxEngine.setPostPhonemeLength === 'function'
      ) {
        voicevoxEngine.setPostPhonemeLength(
          this.options.voicevoxPostPhonemeLength,
        );
      }

      if (
        this.options.voicevoxPauseLength !== undefined &&
        typeof voicevoxEngine.setPauseLength === 'function'
      ) {
        voicevoxEngine.setPauseLength(this.options.voicevoxPauseLength);
      }

      if (
        this.options.voicevoxPauseLengthScale !== undefined &&
        typeof voicevoxEngine.setPauseLengthScale === 'function'
      ) {
        voicevoxEngine.setPauseLengthScale(
          this.options.voicevoxPauseLengthScale,
        );
      }

      if (
        this.options.voicevoxOutputSamplingRate !== undefined &&
        typeof voicevoxEngine.setOutputSamplingRate === 'function'
      ) {
        voicevoxEngine.setOutputSamplingRate(
          this.options.voicevoxOutputSamplingRate,
        );
      }

      if (
        this.options.voicevoxOutputStereo !== undefined &&
        typeof voicevoxEngine.setOutputStereo === 'function'
      ) {
        voicevoxEngine.setOutputStereo(this.options.voicevoxOutputStereo);
      }

      if (
        this.options.voicevoxEnableKatakanaEnglish !== undefined &&
        typeof voicevoxEngine.setEnableKatakanaEnglish === 'function'
      ) {
        voicevoxEngine.setEnableKatakanaEnglish(
          this.options.voicevoxEnableKatakanaEnglish,
        );
      }

      if (
        this.options.voicevoxEnableInterrogativeUpspeak !== undefined &&
        typeof voicevoxEngine.setEnableInterrogativeUpspeak === 'function'
      ) {
        voicevoxEngine.setEnableInterrogativeUpspeak(
          this.options.voicevoxEnableInterrogativeUpspeak,
        );
      }

      if (
        this.options.voicevoxCoreVersion !== undefined &&
        typeof voicevoxEngine.setCoreVersion === 'function'
      ) {
        voicevoxEngine.setCoreVersion(this.options.voicevoxCoreVersion);
      }
    }

    if (this.options.engineType === 'voicepeak') {
      const voicepeakEngine = engine as any;

      if (
        this.options.voicepeakEmotion !== undefined &&
        typeof voicepeakEngine.setEmotion === 'function'
      ) {
        voicepeakEngine.setEmotion(this.options.voicepeakEmotion);
      }

      if (
        this.options.voicepeakSpeed !== undefined &&
        typeof voicepeakEngine.setSpeed === 'function'
      ) {
        voicepeakEngine.setSpeed(this.options.voicepeakSpeed);
      }

      if (
        this.options.voicepeakPitch !== undefined &&
        typeof voicepeakEngine.setPitch === 'function'
      ) {
        voicepeakEngine.setPitch(this.options.voicepeakPitch);
      }
    }

    if (this.options.engineType === 'aivisSpeech') {
      const aivisEngine = engine as any;

      if (
        this.options.aivisSpeechQueryParameters &&
        typeof aivisEngine.setQueryParameters === 'function'
      ) {
        aivisEngine.setQueryParameters(this.options.aivisSpeechQueryParameters);
      }

      if (
        this.options.aivisSpeechSpeedScale !== undefined &&
        typeof aivisEngine.setSpeedScale === 'function'
      ) {
        aivisEngine.setSpeedScale(this.options.aivisSpeechSpeedScale);
      }

      if (
        this.options.aivisSpeechPitchScale !== undefined &&
        typeof aivisEngine.setPitchScale === 'function'
      ) {
        aivisEngine.setPitchScale(this.options.aivisSpeechPitchScale);
      }

      if (
        this.options.aivisSpeechIntonationScale !== undefined &&
        typeof aivisEngine.setIntonationScale === 'function'
      ) {
        aivisEngine.setIntonationScale(this.options.aivisSpeechIntonationScale);
      }

      if (
        this.options.aivisSpeechTempoDynamicsScale !== undefined &&
        typeof aivisEngine.setTempoDynamicsScale === 'function'
      ) {
        aivisEngine.setTempoDynamicsScale(
          this.options.aivisSpeechTempoDynamicsScale,
        );
      }

      if (
        this.options.aivisSpeechVolumeScale !== undefined &&
        typeof aivisEngine.setVolumeScale === 'function'
      ) {
        aivisEngine.setVolumeScale(this.options.aivisSpeechVolumeScale);
      }

      if (
        this.options.aivisSpeechPrePhonemeLength !== undefined &&
        typeof aivisEngine.setPrePhonemeLength === 'function'
      ) {
        aivisEngine.setPrePhonemeLength(
          this.options.aivisSpeechPrePhonemeLength,
        );
      }

      if (
        this.options.aivisSpeechPostPhonemeLength !== undefined &&
        typeof aivisEngine.setPostPhonemeLength === 'function'
      ) {
        aivisEngine.setPostPhonemeLength(
          this.options.aivisSpeechPostPhonemeLength,
        );
      }

      if (
        this.options.aivisSpeechPauseLength !== undefined &&
        typeof aivisEngine.setPauseLength === 'function'
      ) {
        aivisEngine.setPauseLength(this.options.aivisSpeechPauseLength);
      }

      if (
        this.options.aivisSpeechPauseLengthScale !== undefined &&
        typeof aivisEngine.setPauseLengthScale === 'function'
      ) {
        aivisEngine.setPauseLengthScale(
          this.options.aivisSpeechPauseLengthScale,
        );
      }

      if (
        this.options.aivisSpeechOutputSamplingRate !== undefined &&
        typeof aivisEngine.setOutputSamplingRate === 'function'
      ) {
        aivisEngine.setOutputSamplingRate(
          this.options.aivisSpeechOutputSamplingRate,
        );
      }

      if (
        this.options.aivisSpeechOutputStereo !== undefined &&
        typeof aivisEngine.setOutputStereo === 'function'
      ) {
        aivisEngine.setOutputStereo(this.options.aivisSpeechOutputStereo);
      }
    }

    if (this.options.engineType === 'openai') {
      const openaiEngine = engine as any;

      if (
        this.options.openAiModel &&
        typeof openaiEngine.setModel === 'function'
      ) {
        openaiEngine.setModel(this.options.openAiModel);
      }

      if (
        this.options.openAiSpeed !== undefined &&
        typeof openaiEngine.setSpeed === 'function'
      ) {
        openaiEngine.setSpeed(this.options.openAiSpeed);
      }
    }

    if (this.options.engineType === 'minimax') {
      const minimaxEngine = engine as any;

      if (typeof minimaxEngine.setGroupId === 'function') {
        if (this.options.groupId) {
          minimaxEngine.setGroupId(this.options.groupId);
        } else {
          console.warn(
            'MiniMax engine requires GroupId, but it is not provided in options',
          );
        }
      }

      if (
        this.options.endpoint &&
        typeof minimaxEngine.setEndpoint === 'function'
      ) {
        minimaxEngine.setEndpoint(this.options.endpoint);
      }

      if (
        this.options.minimaxModel &&
        typeof minimaxEngine.setModel === 'function'
      ) {
        minimaxEngine.setModel(this.options.minimaxModel);
      }

      if (
        this.options.minimaxLanguageBoost !== undefined &&
        typeof minimaxEngine.setLanguage === 'function'
      ) {
        minimaxEngine.setLanguage(this.options.minimaxLanguageBoost);
      }

      if (
        this.options.minimaxVoiceSettings &&
        typeof minimaxEngine.setVoiceSettings === 'function'
      ) {
        minimaxEngine.setVoiceSettings(this.options.minimaxVoiceSettings);
      }

      if (
        this.options.minimaxSpeed !== undefined &&
        typeof minimaxEngine.setSpeed === 'function'
      ) {
        minimaxEngine.setSpeed(this.options.minimaxSpeed);
      }

      if (
        this.options.minimaxVolume !== undefined &&
        typeof minimaxEngine.setVolume === 'function'
      ) {
        minimaxEngine.setVolume(this.options.minimaxVolume);
      }

      if (
        this.options.minimaxPitch !== undefined &&
        typeof minimaxEngine.setPitch === 'function'
      ) {
        minimaxEngine.setPitch(this.options.minimaxPitch);
      }

      if (
        this.options.minimaxAudioSettings &&
        typeof minimaxEngine.setAudioSettings === 'function'
      ) {
        minimaxEngine.setAudioSettings(this.options.minimaxAudioSettings);
      }

      if (
        this.options.minimaxSampleRate !== undefined &&
        typeof minimaxEngine.setSampleRate === 'function'
      ) {
        minimaxEngine.setSampleRate(this.options.minimaxSampleRate);
      }

      if (
        this.options.minimaxBitrate !== undefined &&
        typeof minimaxEngine.setBitrate === 'function'
      ) {
        minimaxEngine.setBitrate(this.options.minimaxBitrate);
      }

      if (
        this.options.minimaxAudioFormat !== undefined &&
        typeof minimaxEngine.setAudioFormat === 'function'
      ) {
        minimaxEngine.setAudioFormat(this.options.minimaxAudioFormat);
      }

      if (
        this.options.minimaxAudioChannel !== undefined &&
        typeof minimaxEngine.setAudioChannel === 'function'
      ) {
        minimaxEngine.setAudioChannel(this.options.minimaxAudioChannel);
      }
    }

    if (this.options.engineType === 'aivisCloud') {
      const aivisEngine = engine as any;

      if (this.options.aivisCloudModelUuid) {
        aivisEngine.setModelUuid(this.options.aivisCloudModelUuid);
      }

      if (this.options.aivisCloudSpeakerUuid) {
        aivisEngine.setSpeakerUuid(this.options.aivisCloudSpeakerUuid);
      }

      if (this.options.aivisCloudStyleId !== undefined) {
        aivisEngine.setStyleId(this.options.aivisCloudStyleId);
      } else if (this.options.aivisCloudStyleName) {
        aivisEngine.setStyleName(this.options.aivisCloudStyleName);
      }

      if (this.options.aivisCloudUserDictionaryUuid) {
        aivisEngine.setUserDictionaryUuid(
          this.options.aivisCloudUserDictionaryUuid,
        );
      }

      if (this.options.aivisCloudLanguage) {
        aivisEngine.setLanguage(this.options.aivisCloudLanguage);
      }

      if (this.options.aivisCloudUseSSML !== undefined) {
        aivisEngine.setUseSSML(this.options.aivisCloudUseSSML);
      }

      if (this.options.aivisCloudSpeakingRate !== undefined) {
        aivisEngine.setSpeakingRate(this.options.aivisCloudSpeakingRate);
      }
      if (this.options.aivisCloudEmotionalIntensity !== undefined) {
        aivisEngine.setEmotionalIntensity(
          this.options.aivisCloudEmotionalIntensity,
        );
      }
      if (this.options.aivisCloudTempoDynamics !== undefined) {
        aivisEngine.setTempoDynamics(this.options.aivisCloudTempoDynamics);
      }
      if (this.options.aivisCloudPitch !== undefined) {
        aivisEngine.setPitch(this.options.aivisCloudPitch);
      }
      if (this.options.aivisCloudVolume !== undefined) {
        aivisEngine.setVolume(this.options.aivisCloudVolume);
      }

      if (
        this.options.aivisCloudLeadingSilence !== undefined ||
        this.options.aivisCloudTrailingSilence !== undefined ||
        this.options.aivisCloudLineBreakSilence !== undefined
      ) {
        aivisEngine.setSilenceDurations(
          this.options.aivisCloudLeadingSilence ?? 0.1,
          this.options.aivisCloudTrailingSilence ?? 0.1,
          this.options.aivisCloudLineBreakSilence ?? 0.4,
        );
      }

      if (this.options.aivisCloudOutputFormat) {
        aivisEngine.setOutputFormat(this.options.aivisCloudOutputFormat);
      }
      if (this.options.aivisCloudOutputBitrate !== undefined) {
        aivisEngine.setOutputBitrate(this.options.aivisCloudOutputBitrate);
      }
      if (this.options.aivisCloudOutputSamplingRate !== undefined) {
        aivisEngine.setOutputSamplingRate(
          this.options.aivisCloudOutputSamplingRate,
        );
      }
      if (this.options.aivisCloudOutputChannels) {
        aivisEngine.setOutputChannels(this.options.aivisCloudOutputChannels);
      }

      if (this.options.aivisCloudEnableBillingLogs !== undefined) {
        aivisEngine.setEnableBillingLogs(
          this.options.aivisCloudEnableBillingLogs,
        );
      }
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
  updateOptions(options: Partial<VoiceServiceOptions>): void {
    this.options = { ...this.options, ...options };

    // Update audio player callback if onComplete changes
    if (options.onComplete !== undefined) {
      this.audioPlayer.setOnComplete(() => {
        if (this.options.onComplete) {
          this.options.onComplete();
        }
      });
    }
  }
}
