import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { PiperPlusVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type PiperPlusConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'piperPlusBasePath',
  'piperPlusModelConfigFile',
  'piperPlusModelFile',
  'piperPlusVoiceFile',
  'piperPlusSpeed',
  'piperPlusNoiseScale',
] as const;

export const piperPlusEngineHandler: EngineHandler<PiperPlusVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: PiperPlusVoiceServiceOptions) {
      const piperEngine = engine as PiperPlusConfigurableEngine;

      if (
        options.piperPlusBasePath !== undefined &&
        options.piperPlusModelConfigFile !== undefined &&
        options.piperPlusModelFile !== undefined &&
        options.piperPlusVoiceFile !== undefined &&
        piperEngine.setAssets
      ) {
        piperEngine.setAssets({
          basePath: options.piperPlusBasePath,
          modelConfigFile: options.piperPlusModelConfigFile,
          modelFile: options.piperPlusModelFile,
          voiceFile: options.piperPlusVoiceFile,
        });
      }

      if (options.piperPlusSpeed !== undefined && piperEngine.setSpeed) {
        piperEngine.setSpeed(options.piperPlusSpeed);
      }

      if (
        options.piperPlusNoiseScale !== undefined &&
        piperEngine.setNoiseScale
      ) {
        piperEngine.setNoiseScale(options.piperPlusNoiseScale);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
