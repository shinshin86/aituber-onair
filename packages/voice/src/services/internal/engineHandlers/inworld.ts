import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { InworldVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type InworldConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'inworldApiUrl',
  'inworldModel',
  'inworldAudioEncoding',
  'inworldSampleRateHertz',
  'inworldBitRate',
  'inworldSpeakingRate',
  'inworldLanguage',
  'inworldDeliveryMode',
  'inworldTemperature',
] as const;

export const inworldEngineHandler: EngineHandler<InworldVoiceServiceOptions> = {
  allowedUpdateKeys,
  applyOptions(engine: VoiceEngine, options: InworldVoiceServiceOptions) {
    const inworldEngine = engine as InworldConfigurableEngine;

    if (options.inworldApiUrl && inworldEngine.setApiEndpoint) {
      inworldEngine.setApiEndpoint(options.inworldApiUrl);
    }
    if (options.inworldModel !== undefined && inworldEngine.setModel) {
      inworldEngine.setModel(options.inworldModel);
    }
    if (
      options.inworldAudioEncoding !== undefined &&
      inworldEngine.setAudioEncoding
    ) {
      inworldEngine.setAudioEncoding(options.inworldAudioEncoding);
    }
    if (
      options.inworldSampleRateHertz !== undefined &&
      inworldEngine.setSampleRateHertz
    ) {
      inworldEngine.setSampleRateHertz(options.inworldSampleRateHertz);
    }
    if (options.inworldBitRate !== undefined && inworldEngine.setBitRate) {
      inworldEngine.setBitRate(options.inworldBitRate);
    }
    if (
      options.inworldSpeakingRate !== undefined &&
      inworldEngine.setSpeakingRate
    ) {
      inworldEngine.setSpeakingRate(options.inworldSpeakingRate);
    }
    if (options.inworldLanguage !== undefined && inworldEngine.setLanguage) {
      inworldEngine.setLanguage(options.inworldLanguage);
    }
    if (
      options.inworldDeliveryMode !== undefined &&
      inworldEngine.setDeliveryMode
    ) {
      inworldEngine.setDeliveryMode(options.inworldDeliveryMode);
    }
    if (
      options.inworldTemperature !== undefined &&
      inworldEngine.setTemperature
    ) {
      inworldEngine.setTemperature(options.inworldTemperature);
    }
  },
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
