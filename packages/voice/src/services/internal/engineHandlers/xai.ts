import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { XaiVoiceServiceOptions } from '../../VoiceService';
import {
  type EngineHandler,
  type XaiConfigurableEngine,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'xaiLanguage',
  'xaiCodec',
  'xaiSampleRate',
  'xaiBitRate',
] as const;

export const xaiEngineHandler: EngineHandler<XaiVoiceServiceOptions> = {
  allowedUpdateKeys,
  applyOptions(engine: VoiceEngine, options: XaiVoiceServiceOptions) {
    const xaiEngine = engine as XaiConfigurableEngine;

    if (options.xaiLanguage && xaiEngine.setLanguage) {
      xaiEngine.setLanguage(options.xaiLanguage);
    }
    if (options.xaiCodec && xaiEngine.setCodec) {
      xaiEngine.setCodec(options.xaiCodec);
    }
    if (options.xaiSampleRate !== undefined && xaiEngine.setSampleRate) {
      xaiEngine.setSampleRate(options.xaiSampleRate);
    }
    if (options.xaiBitRate !== undefined && xaiEngine.setBitRate) {
      xaiEngine.setBitRate(options.xaiBitRate);
    }
  },
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
