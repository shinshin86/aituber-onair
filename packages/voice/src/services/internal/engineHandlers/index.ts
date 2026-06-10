import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { VoiceServiceOptions } from '../../VoiceService';
import { aivisCloudEngineHandler } from './aivisCloud';
import { aivisSpeechEngineHandler } from './aivisSpeech';
import { elevenLabsEngineHandler } from './elevenLabs';
import { geminiTtsEngineHandler } from './geminiTts';
import { gradiumEngineHandler } from './gradium';
import { inworldEngineHandler } from './inworld';
import { minimaxEngineHandler } from './minimax';
import { noneEngineHandler } from './none';
import { openAiEngineHandler } from './openai';
import { openAiCompatibleEngineHandler } from './openaiCompatible';
import { piperPlusEngineHandler } from './piperPlus';
import type { EngineHandler } from './types';
import { unrealSpeechEngineHandler } from './unrealSpeech';
import { voicePeakEngineHandler } from './voicepeak';
import { voiceVoxEngineHandler } from './voicevox';
import { xaiEngineHandler } from './xai';

type EngineType = VoiceServiceOptions['engineType'];
type OptionsFor<TEngineType extends EngineType> = Extract<
  VoiceServiceOptions,
  { engineType: TEngineType }
>;
type EngineHandlerRegistry = {
  [TEngineType in EngineType]: EngineHandler<OptionsFor<TEngineType>>;
};

const engineHandlers = {
  voicevox: voiceVoxEngineHandler,
  voicepeak: voicePeakEngineHandler,
  openai: openAiEngineHandler,
  xai: xaiEngineHandler,
  unrealSpeech: unrealSpeechEngineHandler,
  elevenLabs: elevenLabsEngineHandler,
  inworld: inworldEngineHandler,
  gradium: gradiumEngineHandler,
  geminiTts: geminiTtsEngineHandler,
  openaiCompatible: openAiCompatibleEngineHandler,
  aivisSpeech: aivisSpeechEngineHandler,
  aivisCloud: aivisCloudEngineHandler,
  minimax: minimaxEngineHandler,
  piperPlus: piperPlusEngineHandler,
  none: noneEngineHandler,
} as const satisfies EngineHandlerRegistry;

function getEngineHandler<TEngineType extends EngineType>(
  engineType: TEngineType,
): EngineHandler<OptionsFor<TEngineType>> {
  return engineHandlers[engineType] as EngineHandler<OptionsFor<TEngineType>>;
}

export function applyOptionsToEngine<TEngineType extends EngineType>(
  engine: VoiceEngine,
  options: OptionsFor<TEngineType>,
): void {
  getEngineHandler(options.engineType).applyOptions(engine, options);
}

export function getAllowedUpdateKeys(
  engineType: EngineType,
): readonly string[] {
  return getEngineHandler(engineType).allowedUpdateKeys;
}

export function mergeOptionsForEngine<TEngineType extends EngineType>(
  current: OptionsFor<TEngineType>,
  update: Partial<Omit<OptionsFor<TEngineType>, 'engineType'>>,
): OptionsFor<TEngineType> {
  return getEngineHandler(current.engineType).mergeOptions(current, update);
}
