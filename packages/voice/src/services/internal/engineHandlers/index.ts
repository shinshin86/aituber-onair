import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type {
  VoiceServiceOptions,
  VoiceServiceOptionsUpdate,
} from '../../VoiceService';
import { aivisCloudEngineHandler } from './aivisCloud';
import { aivisSpeechEngineHandler } from './aivisSpeech';
import { minimaxEngineHandler } from './minimax';
import { noneEngineHandler } from './none';
import { openAiEngineHandler } from './openai';
import { openAiCompatibleEngineHandler } from './openaiCompatible';
import type { EngineHandler } from './types';
import { voicePeakEngineHandler } from './voicepeak';
import { voiceVoxEngineHandler } from './voicevox';
import { xaiEngineHandler } from './xai';

const engineHandlers = {
  voicevox: voiceVoxEngineHandler,
  voicepeak: voicePeakEngineHandler,
  openai: openAiEngineHandler,
  xai: xaiEngineHandler,
  openaiCompatible: openAiCompatibleEngineHandler,
  aivisSpeech: aivisSpeechEngineHandler,
  aivisCloud: aivisCloudEngineHandler,
  minimax: minimaxEngineHandler,
  none: noneEngineHandler,
} as const;

function getEngineHandler(engineType: VoiceServiceOptions['engineType']) {
  return engineHandlers[engineType] as EngineHandler<any>;
}

export function applyOptionsToEngine(
  engine: VoiceEngine,
  options: VoiceServiceOptions,
): void {
  getEngineHandler(options.engineType).applyOptions(engine, options);
}

export function getAllowedUpdateKeys(
  engineType: VoiceServiceOptions['engineType'],
): readonly string[] {
  return getEngineHandler(engineType).allowedUpdateKeys;
}

export function mergeOptionsForEngine(
  current: VoiceServiceOptions,
  update: VoiceServiceOptionsUpdate,
): VoiceServiceOptions {
  return getEngineHandler(current.engineType).mergeOptions(current, update);
}
