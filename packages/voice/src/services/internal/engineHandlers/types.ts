import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type {
  AivisCloudVoiceServiceOptions,
  AivisSpeechVoiceServiceOptions,
  MinimaxVoiceServiceOptions,
  OpenAiVoiceServiceOptions,
  VoicePeakVoiceServiceOptions,
  VoiceServiceOptions,
  VoiceVoxVoiceServiceOptions,
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
  readonly allowedUpdateKeys: readonly string[];
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
