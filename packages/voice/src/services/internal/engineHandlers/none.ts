import type { VoiceEngine } from '../../../engines/VoiceEngine.js';
import type { NoneVoiceServiceOptions } from '../../VoiceService.js';
import { type EngineHandler, mergeOptionValues } from './types.js';

export const noneEngineHandler: EngineHandler<NoneVoiceServiceOptions> = {
  allowedUpdateKeys: [],
  applyOptions(_engine: VoiceEngine, _options: NoneVoiceServiceOptions) {},
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
