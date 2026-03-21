import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { AivisSpeechVoiceServiceOptions } from '../../VoiceService';
import {
  type AivisSpeechConfigurableEngine,
  type EngineHandler,
  hasApiEndpointSetter,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
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
] as const;

export const aivisSpeechEngineHandler: EngineHandler<AivisSpeechVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: AivisSpeechVoiceServiceOptions) {
      const aivisEngine = engine as AivisSpeechConfigurableEngine;

      if (options.aivisSpeechApiUrl && hasApiEndpointSetter(engine)) {
        engine.setApiEndpoint(options.aivisSpeechApiUrl);
      }
      if (
        options.aivisSpeechQueryParameters &&
        aivisEngine.setQueryParameters
      ) {
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
        aivisEngine.setTempoDynamicsScale(
          options.aivisSpeechTempoDynamicsScale,
        );
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
        aivisEngine.setOutputSamplingRate(
          options.aivisSpeechOutputSamplingRate,
        );
      }
      if (
        options.aivisSpeechOutputStereo !== undefined &&
        aivisEngine.setOutputStereo
      ) {
        aivisEngine.setOutputStereo(options.aivisSpeechOutputStereo);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
