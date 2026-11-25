import type { VoiceEngine } from '../../../engines/VoiceEngine.js';
import type { OpenAiVoiceServiceOptions } from '../../VoiceService.js';
import {
  type EngineHandler,
  type OpenAiConfigurableEngine,
  mergeOptionValues,
} from './types.js';

const allowedUpdateKeys = ['openAiModel', 'openAiSpeed'] as const;

export const openAiEngineHandler: EngineHandler<OpenAiVoiceServiceOptions> = {
  allowedUpdateKeys,
  applyOptions(engine: VoiceEngine, options: OpenAiVoiceServiceOptions) {
    const openaiEngine = engine as OpenAiConfigurableEngine;

    if (options.openAiModel && openaiEngine.setModel) {
      openaiEngine.setModel(options.openAiModel);
    }
    if (options.openAiSpeed !== undefined && openaiEngine.setSpeed) {
      openaiEngine.setSpeed(options.openAiSpeed);
    }
  },
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
