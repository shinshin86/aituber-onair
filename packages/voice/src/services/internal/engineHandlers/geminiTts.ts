import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { GeminiTtsVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type GeminiTtsConfigurableEngine,
  hasApiEndpointSetter,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'geminiTtsApiUrl',
  'geminiTtsModel',
  'geminiTtsLanguageCode',
  'geminiTtsPrompt',
] as const;

export const geminiTtsEngineHandler: EngineHandler<GeminiTtsVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: GeminiTtsVoiceServiceOptions) {
      const geminiTtsEngine = engine as GeminiTtsConfigurableEngine;

      if (
        options.geminiTtsApiUrl !== undefined &&
        hasApiEndpointSetter(engine)
      ) {
        engine.setApiEndpoint(options.geminiTtsApiUrl);
      }

      if (options.geminiTtsModel !== undefined && geminiTtsEngine.setModel) {
        geminiTtsEngine.setModel(options.geminiTtsModel);
      }

      if (
        options.geminiTtsLanguageCode !== undefined &&
        geminiTtsEngine.setLanguageCode
      ) {
        geminiTtsEngine.setLanguageCode(options.geminiTtsLanguageCode);
      }

      if (options.geminiTtsPrompt !== undefined && geminiTtsEngine.setPrompt) {
        geminiTtsEngine.setPrompt(options.geminiTtsPrompt);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
