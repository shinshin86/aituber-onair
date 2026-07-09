import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { PiperPlusAssets } from '../../../engines/PiperPlusEngine';
import type {
  AivisCloudVoiceServiceOptions,
  AivisSpeechVoiceServiceOptions,
  ElevenLabsVoiceServiceOptions,
  GeminiTtsVoiceServiceOptions,
  GradiumVoiceServiceOptions,
  InworldVoiceServiceOptions,
  MinimaxVoiceServiceOptions,
  OpenAiVoiceServiceOptions,
  PiperPlusVoiceServiceOptions,
  UnrealSpeechVoiceServiceOptions,
  VoicePeakVoiceServiceOptions,
  VoiceServiceOptions,
  VoiceVoxVoiceServiceOptions,
  WebSpeechVoiceServiceOptions,
  XaiVoiceServiceOptions,
} from '../../VoiceService';

export interface ApiEndpointConfigurableEngine extends VoiceEngine {
  setApiEndpoint(apiUrl: string): void;
}

export interface VoiceVoxConfigurableEngine extends VoiceEngine {
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

export interface VoicePeakConfigurableEngine extends VoiceEngine {
  setEmotion?(value?: VoicePeakVoiceServiceOptions['voicepeakEmotion']): void;
  setSpeed?(value?: number): void;
  setPitch?(value?: number): void;
}

export interface AivisSpeechConfigurableEngine extends VoiceEngine {
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

export interface OpenAiConfigurableEngine extends VoiceEngine {
  setModel?(value: string): void;
  setSpeed?(value?: number): void;
}

export interface XaiConfigurableEngine extends VoiceEngine {
  setLanguage?(value: string): void;
  setCodec?(value: NonNullable<XaiVoiceServiceOptions['xaiCodec']>): void;
  setSampleRate?(
    value: NonNullable<XaiVoiceServiceOptions['xaiSampleRate']>,
  ): void;
  setBitRate?(value: NonNullable<XaiVoiceServiceOptions['xaiBitRate']>): void;
}

export interface UnrealSpeechConfigurableEngine extends VoiceEngine {
  setApiEndpoint?(value: string): void;
  setBitrate?(value?: string): void;
  setSpeed?(value?: number): void;
  setPitch?(value?: number): void;
  setCodec?(
    value?: NonNullable<UnrealSpeechVoiceServiceOptions['unrealSpeechCodec']>,
  ): void;
  setTemperature?(value?: number): void;
}

export interface ElevenLabsConfigurableEngine extends VoiceEngine {
  setApiEndpoint?(value: string): void;
  setModel?(value: string): void;
  setOutputFormat?(value?: string): void;
  setLanguageCode?(value?: string): void;
  setVoiceSettings?(
    value: NonNullable<
      ElevenLabsVoiceServiceOptions['elevenLabsVoiceSettings']
    >,
  ): void;
  setStability?(value?: number): void;
  setSimilarityBoost?(value?: number): void;
  setStyle?(value?: number): void;
  setUseSpeakerBoost?(value?: boolean): void;
  setSpeed?(value?: number): void;
  setSeed?(value?: number): void;
  setPreviousText?(value?: string): void;
  setNextText?(value?: string): void;
  setApplyTextNormalization?(
    value?: ElevenLabsVoiceServiceOptions['elevenLabsApplyTextNormalization'],
  ): void;
  setApplyLanguageTextNormalization?(value?: boolean): void;
  setEnableLogging?(value?: boolean): void;
}

export interface InworldConfigurableEngine extends VoiceEngine {
  setApiEndpoint?(value: string): void;
  setModel?(value?: string): void;
  setAudioEncoding?(
    value?: InworldVoiceServiceOptions['inworldAudioEncoding'],
  ): void;
  setSampleRateHertz?(value?: number): void;
  setBitRate?(value?: number): void;
  setSpeakingRate?(value?: number): void;
  setLanguage?(value?: string): void;
  setDeliveryMode?(
    value?: InworldVoiceServiceOptions['inworldDeliveryMode'],
  ): void;
  setTemperature?(value?: number): void;
}

export interface GradiumConfigurableEngine extends VoiceEngine {
  setApiEndpoint?(value: string): void;
  setOutputFormat?(
    value?: GradiumVoiceServiceOptions['gradiumOutputFormat'],
  ): void;
  setTemperature?(value?: number): void;
  setVoiceSimilarity?(value?: number): void;
  setPaddingBonus?(value?: number): void;
  setRewriteRules?(value?: string): void;
}

export interface GeminiTtsConfigurableEngine extends VoiceEngine {
  setModel?(
    value: NonNullable<GeminiTtsVoiceServiceOptions['geminiTtsModel']>,
  ): void;
  setLanguageCode?(value: string): void;
  setPrompt?(value?: GeminiTtsVoiceServiceOptions['geminiTtsPrompt']): void;
}

export interface OpenAiCompatibleConfigurableEngine extends VoiceEngine {
  setApiEndpoint?(value: string): void;
  setModel?(value: string): void;
  setSpeed?(value?: number): void;
}

export interface MinimaxConfigurableEngine extends VoiceEngine {
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

export interface PiperPlusConfigurableEngine extends VoiceEngine {
  setAssets?(assets: PiperPlusAssets): void;
  setSpeed?(value?: number): void;
  setNoiseScale?(value?: number): void;
}

export interface WebSpeechConfigurableEngine extends VoiceEngine {
  setRate?(value?: number): void;
  setPitch?(value?: number): void;
  setVolume?(value?: number): void;
  setLanguage?(value?: string): void;
}

export interface AivisCloudConfigurableEngine extends VoiceEngine {
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

export interface EngineHandler<TOptions extends VoiceServiceOptions> {
  readonly allowedUpdateKeys: readonly (keyof Omit<TOptions, 'engineType'>)[];
  applyOptions(engine: VoiceEngine, options: TOptions): void;
  mergeOptions(
    current: TOptions,
    update: Partial<Omit<TOptions, 'engineType'>>,
  ): TOptions;
}

export function hasApiEndpointSetter(
  engine: VoiceEngine,
): engine is ApiEndpointConfigurableEngine {
  return (
    typeof (engine as ApiEndpointConfigurableEngine).setApiEndpoint ===
    'function'
  );
}

export function mergeOptionValues<TOptions extends VoiceServiceOptions>(
  current: TOptions,
  update: Partial<Omit<TOptions, 'engineType'>>,
): TOptions {
  return {
    ...current,
    ...update,
  };
}
