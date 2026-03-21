import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { VoicePeakVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type VoicePeakConfigurableEngine,
  hasApiEndpointSetter,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'voicepeakApiUrl',
  'voicepeakEmotion',
  'voicepeakSpeed',
  'voicepeakPitch',
] as const;

export const voicePeakEngineHandler: EngineHandler<VoicePeakVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: VoicePeakVoiceServiceOptions) {
      const voicepeakEngine = engine as VoicePeakConfigurableEngine;

      if (options.voicepeakApiUrl && hasApiEndpointSetter(engine)) {
        engine.setApiEndpoint(options.voicepeakApiUrl);
      }
      if (
        options.voicepeakEmotion !== undefined &&
        voicepeakEngine.setEmotion
      ) {
        voicepeakEngine.setEmotion(options.voicepeakEmotion);
      }
      if (options.voicepeakSpeed !== undefined && voicepeakEngine.setSpeed) {
        voicepeakEngine.setSpeed(options.voicepeakSpeed);
      }
      if (options.voicepeakPitch !== undefined && voicepeakEngine.setPitch) {
        voicepeakEngine.setPitch(options.voicepeakPitch);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
