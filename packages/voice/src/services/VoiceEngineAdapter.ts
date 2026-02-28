import { AudioPlayer } from '../types/audioPlayer';
import { ChatScreenplay } from '../types/chat';
import { Talk, TalkStyle } from '../types/voice';
import { textToScreenplay } from '../utils/screenplay';
import {
  AudioPlayOptions,
  AivisCloudVoiceServiceOptions,
  AivisCloudVoiceServiceOptionsUpdate,
  AivisSpeechVoiceServiceOptions,
  AivisSpeechVoiceServiceOptionsUpdate,
  MinimaxVoiceServiceOptionsUpdate,
  MinimaxVoiceServiceOptions,
  NoneVoiceServiceOptionsUpdate,
  OpenAiVoiceServiceOptionsUpdate,
  OpenAiVoiceServiceOptions,
  VoicePeakVoiceServiceOptionsUpdate,
  VoicePeakVoiceServiceOptions,
  VoiceService,
  VoiceServiceOptions,
  VoiceServiceOptionsUpdate,
  VoiceVoxVoiceServiceOptionsUpdate,
  VoiceVoxVoiceServiceOptions,
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

interface ApiEndpointConfigurableEngine extends VoiceEngine {
  setApiEndpoint(apiUrl: string): void;
}

interface VoiceVoxConfigurableEngine extends VoiceEngine {
  setQueryParameters?(
    overrides: NonNullable<
      VoiceVoxVoiceServiceOptions['voicevoxQueryParameters']
    >,
  ): void;
  setSpeedScale?(value?: number): void;
  setPitchScale?(value?: number): void;
  setIntonationScale?(value?: number): void;
  setVolumeScale?(value?: number): void;
  setPrePhonemeLength?(value?: number): void;
  setPostPhonemeLength?(value?: number): void;
  setPauseLength?(value?: number | null): void;
  setPauseLengthScale?(value?: number): void;
  setOutputSamplingRate?(value?: number): void;
  setOutputStereo?(value?: boolean): void;
  setEnableKatakanaEnglish?(value?: boolean): void;
  setEnableInterrogativeUpspeak?(value?: boolean): void;
  setCoreVersion?(value?: string): void;
}

interface VoicePeakConfigurableEngine extends VoiceEngine {
  setEmotion?(value?: VoicePeakVoiceServiceOptions['voicepeakEmotion']): void;
  setSpeed?(value?: number): void;
  setPitch?(value?: number): void;
}

interface AivisSpeechConfigurableEngine extends VoiceEngine {
  setQueryParameters?(
    overrides: NonNullable<
      AivisSpeechVoiceServiceOptions['aivisSpeechQueryParameters']
    >,
  ): void;
  setSpeedScale?(value?: number): void;
  setPitchScale?(value?: number): void;
  setIntonationScale?(value?: number): void;
  setTempoDynamicsScale?(value?: number): void;
  setVolumeScale?(value?: number): void;
  setPrePhonemeLength?(value?: number): void;
  setPostPhonemeLength?(value?: number): void;
  setPauseLength?(value?: number | null): void;
  setPauseLengthScale?(value?: number): void;
  setOutputSamplingRate?(value?: number): void;
  setOutputStereo?(value?: boolean): void;
}

interface OpenAiConfigurableEngine extends VoiceEngine {
  setModel?(value: string): void;
  setSpeed?(value?: number): void;
}

interface MinimaxConfigurableEngine extends VoiceEngine {
  setGroupId?(value: string): void;
  setEndpoint?(
    value: NonNullable<MinimaxVoiceServiceOptions['endpoint']>,
  ): void;
  setModel?(value: string): void;
  setLanguage?(value: string): void;
  setVoiceSettings?(
    value: NonNullable<MinimaxVoiceServiceOptions['minimaxVoiceSettings']>,
  ): void;
  setSpeed?(value?: number): void;
  setVolume?(value?: number): void;
  setPitch?(value?: number): void;
  setAudioSettings?(
    value: NonNullable<MinimaxVoiceServiceOptions['minimaxAudioSettings']>,
  ): void;
  setSampleRate?(value?: number): void;
  setBitrate?(value?: number): void;
  setAudioFormat?(
    value?: MinimaxVoiceServiceOptions['minimaxAudioFormat'],
  ): void;
  setAudioChannel?(
    value?: MinimaxVoiceServiceOptions['minimaxAudioChannel'],
  ): void;
}

interface AivisCloudConfigurableEngine extends VoiceEngine {
  setModelUuid?(value: string): void;
  setSpeakerUuid?(value: string): void;
  setStyleId?(value: number): void;
  setStyleName?(value: string): void;
  setUserDictionaryUuid?(value: string): void;
  setLanguage?(value: string): void;
  setUseSSML?(value: boolean): void;
  setSpeakingRate?(value: number): void;
  setEmotionalIntensity?(value: number): void;
  setTempoDynamics?(value: number): void;
  setPitch?(value: number): void;
  setVolume?(value: number): void;
  setSilenceDurations?(
    leading: number,
    trailing: number,
    lineBreak: number,
  ): void;
  setOutputFormat?(
    value: NonNullable<AivisCloudVoiceServiceOptions['aivisCloudOutputFormat']>,
  ): void;
  setOutputBitrate?(value: number): void;
  setOutputSamplingRate?(
    value: NonNullable<
      AivisCloudVoiceServiceOptions['aivisCloudOutputSamplingRate']
    >,
  ): void;
  setOutputChannels?(
    value: NonNullable<
      AivisCloudVoiceServiceOptions['aivisCloudOutputChannels']
    >,
  ): void;
  setEnableBillingLogs?(value: boolean): void;
}

const COMMON_UPDATE_KEYS = [
  'speaker',
  'apiKey',
  'onPlay',
  'onComplete',
] as const;

const ENGINE_SPECIFIC_UPDATE_KEYS = {
  voicevox: [
    'voicevoxApiUrl',
    'voicevoxQueryParameters',
    'voicevoxSpeedScale',
    'voicevoxPitchScale',
    'voicevoxIntonationScale',
    'voicevoxVolumeScale',
    'voicevoxPrePhonemeLength',
    'voicevoxPostPhonemeLength',
    'voicevoxPauseLength',
    'voicevoxPauseLengthScale',
    'voicevoxOutputSamplingRate',
    'voicevoxOutputStereo',
    'voicevoxEnableKatakanaEnglish',
    'voicevoxEnableInterrogativeUpspeak',
    'voicevoxCoreVersion',
  ],
  voicepeak: [
    'voicepeakApiUrl',
    'voicepeakEmotion',
    'voicepeakSpeed',
    'voicepeakPitch',
  ],
  openai: ['openAiModel', 'openAiSpeed'],
  aivisSpeech: [
    'aivisSpeechApiUrl',
    'aivisSpeechQueryParameters',
    'aivisSpeechSpeedScale',
    'aivisSpeechPitchScale',
    'aivisSpeechIntonationScale',
    'aivisSpeechTempoDynamicsScale',
    'aivisSpeechVolumeScale',
    'aivisSpeechPrePhonemeLength',
    'aivisSpeechPostPhonemeLength',
    'aivisSpeechPauseLength',
    'aivisSpeechPauseLengthScale',
    'aivisSpeechOutputSamplingRate',
    'aivisSpeechOutputStereo',
  ],
  minimax: [
    'groupId',
    'endpoint',
    'minimaxModel',
    'minimaxVoiceSettings',
    'minimaxAudioSettings',
    'minimaxSpeed',
    'minimaxVolume',
    'minimaxPitch',
    'minimaxSampleRate',
    'minimaxBitrate',
    'minimaxAudioFormat',
    'minimaxAudioChannel',
    'minimaxLanguageBoost',
  ],
  aivisCloud: [
    'aivisCloudModelUuid',
    'aivisCloudSpeakerUuid',
    'aivisCloudStyleId',
    'aivisCloudStyleName',
    'aivisCloudUserDictionaryUuid',
    'aivisCloudUseSSML',
    'aivisCloudLanguage',
    'aivisCloudSpeakingRate',
    'aivisCloudEmotionalIntensity',
    'aivisCloudTempoDynamics',
    'aivisCloudPitch',
    'aivisCloudVolume',
    'aivisCloudLeadingSilence',
    'aivisCloudTrailingSilence',
    'aivisCloudLineBreakSilence',
    'aivisCloudOutputFormat',
    'aivisCloudOutputBitrate',
    'aivisCloudOutputSamplingRate',
    'aivisCloudOutputChannels',
    'aivisCloudEnableBillingLogs',
  ],
  none: [],
} as const satisfies Record<
  VoiceServiceOptions['engineType'],
  readonly string[]
>;

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

    this.applyEngineOverrides(engine);

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

  private hasApiEndpointSetter(
    engine: VoiceEngine,
  ): engine is ApiEndpointConfigurableEngine {
    return typeof engine.setApiEndpoint === 'function';
  }

  private applyEngineOverrides(engine: VoiceEngine): void {
    this.applyApiEndpointOverride(engine);

    switch (this.options.engineType) {
      case 'voicevox':
        this.applyVoiceVoxOverrides(engine, this.options);
        break;
      case 'voicepeak':
        this.applyVoicePeakOverrides(engine, this.options);
        break;
      case 'aivisSpeech':
        this.applyAivisSpeechOverrides(engine, this.options);
        break;
      case 'openai':
        this.applyOpenAiOverrides(engine, this.options);
        break;
      case 'minimax':
        this.applyMinimaxOverrides(engine, this.options);
        break;
      case 'aivisCloud':
        this.applyAivisCloudOverrides(engine, this.options);
        break;
      case 'none':
        break;
    }
  }

  private applyApiEndpointOverride(engine: VoiceEngine): void {
    if (!this.hasApiEndpointSetter(engine)) {
      return;
    }

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
      default:
        break;
    }
  }

  private applyVoiceVoxOverrides(
    engine: VoiceEngine,
    options: VoiceVoxVoiceServiceOptions,
  ): void {
    const voicevoxEngine = engine as VoiceVoxConfigurableEngine;

    if (options.voicevoxQueryParameters && voicevoxEngine.setQueryParameters) {
      voicevoxEngine.setQueryParameters(options.voicevoxQueryParameters);
    }
    if (
      options.voicevoxSpeedScale !== undefined &&
      voicevoxEngine.setSpeedScale
    ) {
      voicevoxEngine.setSpeedScale(options.voicevoxSpeedScale);
    }
    if (
      options.voicevoxPitchScale !== undefined &&
      voicevoxEngine.setPitchScale
    ) {
      voicevoxEngine.setPitchScale(options.voicevoxPitchScale);
    }
    if (
      options.voicevoxIntonationScale !== undefined &&
      voicevoxEngine.setIntonationScale
    ) {
      voicevoxEngine.setIntonationScale(options.voicevoxIntonationScale);
    }
    if (
      options.voicevoxVolumeScale !== undefined &&
      voicevoxEngine.setVolumeScale
    ) {
      voicevoxEngine.setVolumeScale(options.voicevoxVolumeScale);
    }
    if (
      options.voicevoxPrePhonemeLength !== undefined &&
      voicevoxEngine.setPrePhonemeLength
    ) {
      voicevoxEngine.setPrePhonemeLength(options.voicevoxPrePhonemeLength);
    }
    if (
      options.voicevoxPostPhonemeLength !== undefined &&
      voicevoxEngine.setPostPhonemeLength
    ) {
      voicevoxEngine.setPostPhonemeLength(options.voicevoxPostPhonemeLength);
    }
    if (
      options.voicevoxPauseLength !== undefined &&
      voicevoxEngine.setPauseLength
    ) {
      voicevoxEngine.setPauseLength(options.voicevoxPauseLength);
    }
    if (
      options.voicevoxPauseLengthScale !== undefined &&
      voicevoxEngine.setPauseLengthScale
    ) {
      voicevoxEngine.setPauseLengthScale(options.voicevoxPauseLengthScale);
    }
    if (
      options.voicevoxOutputSamplingRate !== undefined &&
      voicevoxEngine.setOutputSamplingRate
    ) {
      voicevoxEngine.setOutputSamplingRate(options.voicevoxOutputSamplingRate);
    }
    if (
      options.voicevoxOutputStereo !== undefined &&
      voicevoxEngine.setOutputStereo
    ) {
      voicevoxEngine.setOutputStereo(options.voicevoxOutputStereo);
    }
    if (
      options.voicevoxEnableKatakanaEnglish !== undefined &&
      voicevoxEngine.setEnableKatakanaEnglish
    ) {
      voicevoxEngine.setEnableKatakanaEnglish(
        options.voicevoxEnableKatakanaEnglish,
      );
    }
    if (
      options.voicevoxEnableInterrogativeUpspeak !== undefined &&
      voicevoxEngine.setEnableInterrogativeUpspeak
    ) {
      voicevoxEngine.setEnableInterrogativeUpspeak(
        options.voicevoxEnableInterrogativeUpspeak,
      );
    }
    if (
      options.voicevoxCoreVersion !== undefined &&
      voicevoxEngine.setCoreVersion
    ) {
      voicevoxEngine.setCoreVersion(options.voicevoxCoreVersion);
    }
  }

  private applyVoicePeakOverrides(
    engine: VoiceEngine,
    options: VoicePeakVoiceServiceOptions,
  ): void {
    const voicepeakEngine = engine as VoicePeakConfigurableEngine;

    if (options.voicepeakEmotion !== undefined && voicepeakEngine.setEmotion) {
      voicepeakEngine.setEmotion(options.voicepeakEmotion);
    }
    if (options.voicepeakSpeed !== undefined && voicepeakEngine.setSpeed) {
      voicepeakEngine.setSpeed(options.voicepeakSpeed);
    }
    if (options.voicepeakPitch !== undefined && voicepeakEngine.setPitch) {
      voicepeakEngine.setPitch(options.voicepeakPitch);
    }
  }

  private applyAivisSpeechOverrides(
    engine: VoiceEngine,
    options: AivisSpeechVoiceServiceOptions,
  ): void {
    const aivisEngine = engine as AivisSpeechConfigurableEngine;

    if (options.aivisSpeechQueryParameters && aivisEngine.setQueryParameters) {
      aivisEngine.setQueryParameters(options.aivisSpeechQueryParameters);
    }
    if (
      options.aivisSpeechSpeedScale !== undefined &&
      aivisEngine.setSpeedScale
    ) {
      aivisEngine.setSpeedScale(options.aivisSpeechSpeedScale);
    }
    if (
      options.aivisSpeechPitchScale !== undefined &&
      aivisEngine.setPitchScale
    ) {
      aivisEngine.setPitchScale(options.aivisSpeechPitchScale);
    }
    if (
      options.aivisSpeechIntonationScale !== undefined &&
      aivisEngine.setIntonationScale
    ) {
      aivisEngine.setIntonationScale(options.aivisSpeechIntonationScale);
    }
    if (
      options.aivisSpeechTempoDynamicsScale !== undefined &&
      aivisEngine.setTempoDynamicsScale
    ) {
      aivisEngine.setTempoDynamicsScale(options.aivisSpeechTempoDynamicsScale);
    }
    if (
      options.aivisSpeechVolumeScale !== undefined &&
      aivisEngine.setVolumeScale
    ) {
      aivisEngine.setVolumeScale(options.aivisSpeechVolumeScale);
    }
    if (
      options.aivisSpeechPrePhonemeLength !== undefined &&
      aivisEngine.setPrePhonemeLength
    ) {
      aivisEngine.setPrePhonemeLength(options.aivisSpeechPrePhonemeLength);
    }
    if (
      options.aivisSpeechPostPhonemeLength !== undefined &&
      aivisEngine.setPostPhonemeLength
    ) {
      aivisEngine.setPostPhonemeLength(options.aivisSpeechPostPhonemeLength);
    }
    if (
      options.aivisSpeechPauseLength !== undefined &&
      aivisEngine.setPauseLength
    ) {
      aivisEngine.setPauseLength(options.aivisSpeechPauseLength);
    }
    if (
      options.aivisSpeechPauseLengthScale !== undefined &&
      aivisEngine.setPauseLengthScale
    ) {
      aivisEngine.setPauseLengthScale(options.aivisSpeechPauseLengthScale);
    }
    if (
      options.aivisSpeechOutputSamplingRate !== undefined &&
      aivisEngine.setOutputSamplingRate
    ) {
      aivisEngine.setOutputSamplingRate(options.aivisSpeechOutputSamplingRate);
    }
    if (
      options.aivisSpeechOutputStereo !== undefined &&
      aivisEngine.setOutputStereo
    ) {
      aivisEngine.setOutputStereo(options.aivisSpeechOutputStereo);
    }
  }

  private applyOpenAiOverrides(
    engine: VoiceEngine,
    options: OpenAiVoiceServiceOptions,
  ): void {
    const openaiEngine = engine as OpenAiConfigurableEngine;

    if (options.openAiModel && openaiEngine.setModel) {
      openaiEngine.setModel(options.openAiModel);
    }
    if (options.openAiSpeed !== undefined && openaiEngine.setSpeed) {
      openaiEngine.setSpeed(options.openAiSpeed);
    }
  }

  private applyMinimaxOverrides(
    engine: VoiceEngine,
    options: MinimaxVoiceServiceOptions,
  ): void {
    const minimaxEngine = engine as MinimaxConfigurableEngine;

    if (minimaxEngine.setGroupId) {
      if (options.groupId) {
        minimaxEngine.setGroupId(options.groupId);
      } else {
        console.warn(
          'MiniMax engine requires GroupId, but it is not provided in options',
        );
      }
    }
    if (options.endpoint && minimaxEngine.setEndpoint) {
      minimaxEngine.setEndpoint(options.endpoint);
    }
    if (options.minimaxModel && minimaxEngine.setModel) {
      minimaxEngine.setModel(options.minimaxModel);
    }
    if (
      options.minimaxLanguageBoost !== undefined &&
      minimaxEngine.setLanguage
    ) {
      minimaxEngine.setLanguage(options.minimaxLanguageBoost);
    }
    if (options.minimaxVoiceSettings && minimaxEngine.setVoiceSettings) {
      minimaxEngine.setVoiceSettings(options.minimaxVoiceSettings);
    }
    if (options.minimaxSpeed !== undefined && minimaxEngine.setSpeed) {
      minimaxEngine.setSpeed(options.minimaxSpeed);
    }
    if (options.minimaxVolume !== undefined && minimaxEngine.setVolume) {
      minimaxEngine.setVolume(options.minimaxVolume);
    }
    if (options.minimaxPitch !== undefined && minimaxEngine.setPitch) {
      minimaxEngine.setPitch(options.minimaxPitch);
    }
    if (options.minimaxAudioSettings && minimaxEngine.setAudioSettings) {
      minimaxEngine.setAudioSettings(options.minimaxAudioSettings);
    }
    if (
      options.minimaxSampleRate !== undefined &&
      minimaxEngine.setSampleRate
    ) {
      minimaxEngine.setSampleRate(options.minimaxSampleRate);
    }
    if (options.minimaxBitrate !== undefined && minimaxEngine.setBitrate) {
      minimaxEngine.setBitrate(options.minimaxBitrate);
    }
    if (
      options.minimaxAudioFormat !== undefined &&
      minimaxEngine.setAudioFormat
    ) {
      minimaxEngine.setAudioFormat(options.minimaxAudioFormat);
    }
    if (
      options.minimaxAudioChannel !== undefined &&
      minimaxEngine.setAudioChannel
    ) {
      minimaxEngine.setAudioChannel(options.minimaxAudioChannel);
    }
  }

  private applyAivisCloudOverrides(
    engine: VoiceEngine,
    options: AivisCloudVoiceServiceOptions,
  ): void {
    const aivisEngine = engine as AivisCloudConfigurableEngine;

    if (options.aivisCloudModelUuid && aivisEngine.setModelUuid) {
      aivisEngine.setModelUuid(options.aivisCloudModelUuid);
    }
    if (options.aivisCloudSpeakerUuid && aivisEngine.setSpeakerUuid) {
      aivisEngine.setSpeakerUuid(options.aivisCloudSpeakerUuid);
    }
    if (options.aivisCloudStyleId !== undefined && aivisEngine.setStyleId) {
      aivisEngine.setStyleId(options.aivisCloudStyleId);
    } else if (options.aivisCloudStyleName && aivisEngine.setStyleName) {
      aivisEngine.setStyleName(options.aivisCloudStyleName);
    }
    if (
      options.aivisCloudUserDictionaryUuid &&
      aivisEngine.setUserDictionaryUuid
    ) {
      aivisEngine.setUserDictionaryUuid(options.aivisCloudUserDictionaryUuid);
    }
    if (options.aivisCloudLanguage && aivisEngine.setLanguage) {
      aivisEngine.setLanguage(options.aivisCloudLanguage);
    }
    if (options.aivisCloudUseSSML !== undefined && aivisEngine.setUseSSML) {
      aivisEngine.setUseSSML(options.aivisCloudUseSSML);
    }
    if (
      options.aivisCloudSpeakingRate !== undefined &&
      aivisEngine.setSpeakingRate
    ) {
      aivisEngine.setSpeakingRate(options.aivisCloudSpeakingRate);
    }
    if (
      options.aivisCloudEmotionalIntensity !== undefined &&
      aivisEngine.setEmotionalIntensity
    ) {
      aivisEngine.setEmotionalIntensity(options.aivisCloudEmotionalIntensity);
    }
    if (
      options.aivisCloudTempoDynamics !== undefined &&
      aivisEngine.setTempoDynamics
    ) {
      aivisEngine.setTempoDynamics(options.aivisCloudTempoDynamics);
    }
    if (options.aivisCloudPitch !== undefined && aivisEngine.setPitch) {
      aivisEngine.setPitch(options.aivisCloudPitch);
    }
    if (options.aivisCloudVolume !== undefined && aivisEngine.setVolume) {
      aivisEngine.setVolume(options.aivisCloudVolume);
    }

    if (
      (options.aivisCloudLeadingSilence !== undefined ||
        options.aivisCloudTrailingSilence !== undefined ||
        options.aivisCloudLineBreakSilence !== undefined) &&
      aivisEngine.setSilenceDurations
    ) {
      aivisEngine.setSilenceDurations(
        options.aivisCloudLeadingSilence ?? 0.1,
        options.aivisCloudTrailingSilence ?? 0.1,
        options.aivisCloudLineBreakSilence ?? 0.4,
      );
    }

    if (options.aivisCloudOutputFormat && aivisEngine.setOutputFormat) {
      aivisEngine.setOutputFormat(options.aivisCloudOutputFormat);
    }
    if (
      options.aivisCloudOutputBitrate !== undefined &&
      aivisEngine.setOutputBitrate
    ) {
      aivisEngine.setOutputBitrate(options.aivisCloudOutputBitrate);
    }
    if (
      options.aivisCloudOutputSamplingRate !== undefined &&
      aivisEngine.setOutputSamplingRate
    ) {
      aivisEngine.setOutputSamplingRate(options.aivisCloudOutputSamplingRate);
    }
    if (options.aivisCloudOutputChannels && aivisEngine.setOutputChannels) {
      aivisEngine.setOutputChannels(options.aivisCloudOutputChannels);
    }
    if (
      options.aivisCloudEnableBillingLogs !== undefined &&
      aivisEngine.setEnableBillingLogs
    ) {
      aivisEngine.setEnableBillingLogs(options.aivisCloudEnableBillingLogs);
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
  updateOptions(options: VoiceServiceOptionsUpdate): void {
    this.validateUpdateOptions(options);
    this.mergeOptionsForCurrentEngine(options);

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
      ...ENGINE_SPECIFIC_UPDATE_KEYS[this.options.engineType],
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
    switch (this.options.engineType) {
      case 'voicevox':
        this.options = {
          ...this.options,
          ...(options as VoiceVoxVoiceServiceOptionsUpdate),
        };
        break;
      case 'voicepeak':
        this.options = {
          ...this.options,
          ...(options as VoicePeakVoiceServiceOptionsUpdate),
        };
        break;
      case 'openai':
        this.options = {
          ...this.options,
          ...(options as OpenAiVoiceServiceOptionsUpdate),
        };
        break;
      case 'aivisSpeech':
        this.options = {
          ...this.options,
          ...(options as AivisSpeechVoiceServiceOptionsUpdate),
        };
        break;
      case 'minimax':
        this.options = {
          ...this.options,
          ...(options as MinimaxVoiceServiceOptionsUpdate),
        };
        break;
      case 'aivisCloud':
        this.options = {
          ...this.options,
          ...(options as AivisCloudVoiceServiceOptionsUpdate),
        };
        break;
      case 'none':
        this.options = {
          ...this.options,
          ...(options as NoneVoiceServiceOptionsUpdate),
        };
        break;
    }
  }
}
