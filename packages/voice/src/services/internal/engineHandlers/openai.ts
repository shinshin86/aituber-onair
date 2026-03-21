import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { OpenAiVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type OpenAiConfigurableEngine,
  mergeOptionValues,
} from './types';

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
