import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { VoiceVoxVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type VoiceVoxConfigurableEngine,
  hasApiEndpointSetter,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
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
] as const;

export const voiceVoxEngineHandler: EngineHandler<VoiceVoxVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: VoiceVoxVoiceServiceOptions) {
      const voicevoxEngine = engine as VoiceVoxConfigurableEngine;

      if (options.voicevoxApiUrl && hasApiEndpointSetter(engine)) {
        engine.setApiEndpoint(options.voicevoxApiUrl);
      }
      if (
        options.voicevoxQueryParameters &&
        voicevoxEngine.setQueryParameters
      ) {
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
        voicevoxEngine.setOutputSamplingRate(
          options.voicevoxOutputSamplingRate,
        );
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
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
