import type { VoiceEngine } from '../../../engines/VoiceEngine.js';
import type { OpenRouterVoiceServiceOptions } from '../../VoiceService.js';
import {
  type EngineHandler,
  type OpenRouterConfigurableEngine,
  mergeOptionValues,
} from './types.js';

export const openRouterEngineHandler: EngineHandler<OpenRouterVoiceServiceOptions> =
  {
    allowedUpdateKeys: ['openRouterApiUrl', 'openRouterModel'],
    applyOptions(engine: VoiceEngine, options: OpenRouterVoiceServiceOptions) {
      const openRouterEngine = engine as OpenRouterConfigurableEngine;
      openRouterEngine.setApiEndpoint?.(options.openRouterApiUrl ?? '');
      openRouterEngine.setModel?.(options.openRouterModel);
    },
    mergeOptions(current, update) {
      const merged = mergeOptionValues(current, update);
      if (
        merged.openRouterModel !== current.openRouterModel &&
        update.speaker === undefined
      ) {
        // Model suffixes are not interchangeable. Require a new voice selection.
        merged.speaker = '';
      }
      return merged;
    },
  };
