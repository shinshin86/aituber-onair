import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { NoneVoiceServiceOptions } from '../../VoiceService';
import { type EngineHandler, mergeOptionValues } from './types';

export const noneEngineHandler: EngineHandler<NoneVoiceServiceOptions> = {
  allowedUpdateKeys: [],
  applyOptions(_engine: VoiceEngine, _options: NoneVoiceServiceOptions) {},
  mergeOptions(current, update) {
    return mergeOptionValues(current, update);
  },
};
