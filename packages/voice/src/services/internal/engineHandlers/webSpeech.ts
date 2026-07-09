import type { WebSpeechVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  mergeOptionValues,
  type WebSpeechConfigurableEngine,
} from './types';

export const webSpeechEngineHandler: EngineHandler<WebSpeechVoiceServiceOptions> =
  {
    allowedUpdateKeys: [
      'webSpeechRate',
      'webSpeechPitch',
      'webSpeechVolume',
      'webSpeechLanguage',
    ],
    applyOptions(engine, options) {
      const webSpeechEngine = engine as WebSpeechConfigurableEngine;
      webSpeechEngine.setRate?.(options.webSpeechRate);
      webSpeechEngine.setPitch?.(options.webSpeechPitch);
      webSpeechEngine.setVolume?.(options.webSpeechVolume);
      webSpeechEngine.setLanguage?.(options.webSpeechLanguage);
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
