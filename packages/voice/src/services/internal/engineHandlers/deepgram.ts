import type { VoiceEngine } from '../../../engines/VoiceEngine.js';
import type { DeepgramVoiceServiceOptions } from '../../VoiceService.js';
import {
  type DeepgramConfigurableEngine,
  type EngineHandler,
  mergeOptionValues,
} from './types.js';

export const deepgramEngineHandler: EngineHandler<DeepgramVoiceServiceOptions> =
  {
    allowedUpdateKeys: ['deepgramApiUrl', 'deepgramSpeed'],
    applyOptions(engine: VoiceEngine, options: DeepgramVoiceServiceOptions) {
      const deepgramEngine = engine as DeepgramConfigurableEngine;
      deepgramEngine.setApiEndpoint?.(options.deepgramApiUrl ?? '');
      deepgramEngine.setSpeed?.(options.deepgramSpeed);
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
