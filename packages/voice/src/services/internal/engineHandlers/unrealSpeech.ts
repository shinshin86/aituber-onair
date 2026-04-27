import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { UnrealSpeechVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  mergeOptionValues,
  type UnrealSpeechConfigurableEngine,
} from './types';

const allowedUpdateKeys = [
  'unrealSpeechApiUrl',
  'unrealSpeechBitrate',
  'unrealSpeechSpeed',
  'unrealSpeechPitch',
  'unrealSpeechCodec',
  'unrealSpeechTemperature',
] as const;

export const unrealSpeechEngineHandler: EngineHandler<UnrealSpeechVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(
      engine: VoiceEngine,
      options: UnrealSpeechVoiceServiceOptions,
    ) {
      const unrealSpeechEngine = engine as UnrealSpeechConfigurableEngine;

      if (options.unrealSpeechApiUrl && unrealSpeechEngine.setApiEndpoint) {
        unrealSpeechEngine.setApiEndpoint(options.unrealSpeechApiUrl);
      }
      if (
        options.unrealSpeechBitrate !== undefined &&
        unrealSpeechEngine.setBitrate
      ) {
        unrealSpeechEngine.setBitrate(options.unrealSpeechBitrate);
      }
      if (
        options.unrealSpeechSpeed !== undefined &&
        unrealSpeechEngine.setSpeed
      ) {
        unrealSpeechEngine.setSpeed(options.unrealSpeechSpeed);
      }
      if (
        options.unrealSpeechPitch !== undefined &&
        unrealSpeechEngine.setPitch
      ) {
        unrealSpeechEngine.setPitch(options.unrealSpeechPitch);
      }
      if (
        options.unrealSpeechCodec !== undefined &&
        unrealSpeechEngine.setCodec
      ) {
        unrealSpeechEngine.setCodec(options.unrealSpeechCodec);
      }
      if (
        options.unrealSpeechTemperature !== undefined &&
        unrealSpeechEngine.setTemperature
      ) {
        unrealSpeechEngine.setTemperature(options.unrealSpeechTemperature);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
