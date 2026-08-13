import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { FishAudioVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type FishAudioConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'fishAudioApiUrl',
  'fishAudioModel',
  'fishAudioFormat',
  'fishAudioSampleRate',
  'fishAudioMp3Bitrate',
  'fishAudioLatency',
  'fishAudioSpeed',
] as const;

export const fishAudioEngineHandler: EngineHandler<FishAudioVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: FishAudioVoiceServiceOptions) {
      const fishAudioEngine = engine as FishAudioConfigurableEngine;

      if (options.fishAudioApiUrl && fishAudioEngine.setApiEndpoint) {
        fishAudioEngine.setApiEndpoint(options.fishAudioApiUrl);
      }
      if (options.fishAudioModel !== undefined && fishAudioEngine.setModel) {
        fishAudioEngine.setModel(options.fishAudioModel);
      }
      if (options.fishAudioFormat !== undefined && fishAudioEngine.setFormat) {
        fishAudioEngine.setFormat(options.fishAudioFormat);
      }
      if (
        options.fishAudioSampleRate !== undefined &&
        fishAudioEngine.setSampleRate
      ) {
        fishAudioEngine.setSampleRate(options.fishAudioSampleRate);
      }
      if (
        options.fishAudioMp3Bitrate !== undefined &&
        fishAudioEngine.setMp3Bitrate
      ) {
        fishAudioEngine.setMp3Bitrate(options.fishAudioMp3Bitrate);
      }
      if (
        options.fishAudioLatency !== undefined &&
        fishAudioEngine.setLatency
      ) {
        fishAudioEngine.setLatency(options.fishAudioLatency);
      }
      if (options.fishAudioSpeed !== undefined && fishAudioEngine.setSpeed) {
        fishAudioEngine.setSpeed(options.fishAudioSpeed);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
