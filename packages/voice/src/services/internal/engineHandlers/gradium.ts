import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { GradiumVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type GradiumConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'gradiumApiUrl',
  'gradiumModel',
  'gradiumOutputFormat',
  'gradiumTemperature',
  'gradiumVoiceSimilarity',
  'gradiumPaddingBonus',
  'gradiumRewriteRules',
] as const;

export const gradiumEngineHandler: EngineHandler<GradiumVoiceServiceOptions> = {
  allowedUpdateKeys,
  applyOptions(engine: VoiceEngine, options: GradiumVoiceServiceOptions) {
    const gradiumEngine = engine as GradiumConfigurableEngine;

    if (
      Object.prototype.hasOwnProperty.call(options, 'gradiumModel') &&
      gradiumEngine.setModel
    ) {
      gradiumEngine.setModel(options.gradiumModel);
    }
    if (options.gradiumApiUrl && gradiumEngine.setApiEndpoint) {
      gradiumEngine.setApiEndpoint(options.gradiumApiUrl);
    }
    if (
      options.gradiumOutputFormat !== undefined &&
      gradiumEngine.setOutputFormat
    ) {
      gradiumEngine.setOutputFormat(options.gradiumOutputFormat);
    }
    if (
      options.gradiumTemperature !== undefined &&
      gradiumEngine.setTemperature
    ) {
      gradiumEngine.setTemperature(options.gradiumTemperature);
    }
    if (
      options.gradiumVoiceSimilarity !== undefined &&
      gradiumEngine.setVoiceSimilarity
    ) {
      gradiumEngine.setVoiceSimilarity(options.gradiumVoiceSimilarity);
    }
    if (
      options.gradiumPaddingBonus !== undefined &&
      gradiumEngine.setPaddingBonus
    ) {
      gradiumEngine.setPaddingBonus(options.gradiumPaddingBonus);
    }
    if (
      options.gradiumRewriteRules !== undefined &&
      gradiumEngine.setRewriteRules
    ) {
      gradiumEngine.setRewriteRules(options.gradiumRewriteRules);
    }
  },
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
