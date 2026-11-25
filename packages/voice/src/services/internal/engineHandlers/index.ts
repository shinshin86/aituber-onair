import type { VoiceEngine } from '../../../engines/VoiceEngine.js';
import type { VoiceServiceOptions } from '../../VoiceService.js';
import { aivisCloudEngineHandler } from './aivisCloud.js';
import { aivisSpeechEngineHandler } from './aivisSpeech.js';
import { cartesiaEngineHandler } from './cartesia.js';
import { deepgramEngineHandler } from './deepgram.js';
import { elevenLabsEngineHandler } from './elevenLabs.js';
import { fishAudioEngineHandler } from './fishAudio.js';
import { geminiTtsEngineHandler } from './geminiTts.js';
import { gradiumEngineHandler } from './gradium.js';
import { inworldEngineHandler } from './inworld.js';
import { minimaxEngineHandler } from './minimax.js';
import { noneEngineHandler } from './none.js';
import { openRouterEngineHandler } from './openRouter.js';
import { openAiEngineHandler } from './openai.js';
import { openAiCompatibleEngineHandler } from './openaiCompatible.js';
import { piperPlusEngineHandler } from './piperPlus.js';
import type { EngineHandler } from './types.js';
import { unrealSpeechEngineHandler } from './unrealSpeech.js';
import { voicePeakEngineHandler } from './voicepeak.js';
import { voiceVoxEngineHandler } from './voicevox.js';
import { webSpeechEngineHandler } from './webSpeech.js';
import { xaiEngineHandler } from './xai.js';

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
  openRouter: openRouterEngineHandler,
  xai: xaiEngineHandler,
  unrealSpeech: unrealSpeechEngineHandler,
  elevenLabs: elevenLabsEngineHandler,
  fishAudio: fishAudioEngineHandler,
  cartesia: cartesiaEngineHandler,
  deepgram: deepgramEngineHandler,
  inworld: inworldEngineHandler,
  gradium: gradiumEngineHandler,
  geminiTts: geminiTtsEngineHandler,
  openaiCompatible: openAiCompatibleEngineHandler,
  aivisSpeech: aivisSpeechEngineHandler,
  aivisCloud: aivisCloudEngineHandler,
  minimax: minimaxEngineHandler,
  piperPlus: piperPlusEngineHandler,
  webSpeech: webSpeechEngineHandler,
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
