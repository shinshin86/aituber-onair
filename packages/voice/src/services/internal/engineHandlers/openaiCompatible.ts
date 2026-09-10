import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { OpenAiCompatibleVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type OpenAiCompatibleConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'openAiCompatibleApiUrl',
  'openAiCompatibleModel',
  'openAiCompatibleSpeed',
  'openAiCompatibleTimeoutMs',
] as const;

export const openAiCompatibleEngineHandler: EngineHandler<OpenAiCompatibleVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(
      engine: VoiceEngine,
      options: OpenAiCompatibleVoiceServiceOptions,
    ) {
      const compatibleEngine = engine as OpenAiCompatibleConfigurableEngine;

      if (
        options.openAiCompatibleTimeoutMs !== undefined &&
        compatibleEngine.setTimeout
      ) {
        compatibleEngine.setTimeout(options.openAiCompatibleTimeoutMs);
      }
      if (options.openAiCompatibleApiUrl && compatibleEngine.setApiEndpoint) {
        compatibleEngine.setApiEndpoint(options.openAiCompatibleApiUrl);
      }
      if (options.openAiCompatibleModel && compatibleEngine.setModel) {
        compatibleEngine.setModel(options.openAiCompatibleModel);
      }
      if (
        options.openAiCompatibleSpeed !== undefined &&
        compatibleEngine.setSpeed
      ) {
        compatibleEngine.setSpeed(options.openAiCompatibleSpeed);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
