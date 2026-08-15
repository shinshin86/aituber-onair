import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { CartesiaVoiceServiceOptions } from '../../VoiceService';
import {
  type CartesiaConfigurableEngine,
  type EngineHandler,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'cartesiaApiUrl',
  'cartesiaModel',
  'cartesiaLanguage',
  'cartesiaOutputContainer',
  'cartesiaSampleRate',
  'cartesiaMp3Bitrate',
] as const;

export const cartesiaEngineHandler: EngineHandler<CartesiaVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: CartesiaVoiceServiceOptions) {
      const cartesiaEngine = engine as CartesiaConfigurableEngine;

      if (options.cartesiaApiUrl && cartesiaEngine.setApiEndpoint) {
        cartesiaEngine.setApiEndpoint(options.cartesiaApiUrl);
      }
      if (options.cartesiaModel !== undefined && cartesiaEngine.setModel) {
        cartesiaEngine.setModel(options.cartesiaModel);
      }
      if (
        options.cartesiaLanguage !== undefined &&
        cartesiaEngine.setLanguage
      ) {
        cartesiaEngine.setLanguage(options.cartesiaLanguage);
      }
      if (
        options.cartesiaOutputContainer !== undefined &&
        cartesiaEngine.setOutputContainer
      ) {
        cartesiaEngine.setOutputContainer(options.cartesiaOutputContainer);
      }
      if (
        options.cartesiaSampleRate !== undefined &&
        cartesiaEngine.setSampleRate
      ) {
        cartesiaEngine.setSampleRate(options.cartesiaSampleRate);
      }
      if (
        options.cartesiaMp3Bitrate !== undefined &&
        cartesiaEngine.setMp3Bitrate
      ) {
        cartesiaEngine.setMp3Bitrate(options.cartesiaMp3Bitrate);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
