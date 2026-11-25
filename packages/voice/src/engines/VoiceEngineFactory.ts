import { VoiceEngineType } from '../types/voiceEngine.js';
import { AivisCloudEngine } from './AivisCloudEngine.js';
import { AivisSpeechEngine } from './AivisSpeechEngine.js';
import { CartesiaEngine } from './CartesiaEngine.js';
import { DeepgramEngine } from './DeepgramEngine.js';
import { ElevenLabsEngine } from './ElevenLabsEngine.js';
import { FishAudioEngine } from './FishAudioEngine.js';
import { GeminiTtsEngine } from './GeminiTtsEngine.js';
import { GradiumEngine } from './GradiumEngine.js';
import { InworldEngine } from './InworldEngine.js';
import { MinimaxEngine } from './MinimaxEngine.js';
import { NoneEngine } from './NoneEngine.js';
import { OpenRouterEngine } from './OpenRouterEngine.js';
import { OpenAiEngine } from './OpenAiEngine.js';
import { OpenAiCompatibleEngine } from './OpenAiCompatibleEngine.js';
import { PiperPlusEngine } from './PiperPlusEngine.js';
import { UnrealSpeechEngine } from './UnrealSpeechEngine.js';
import { VoiceEngine } from './VoiceEngine.js';
import { VoicePeakEngine } from './VoicePeakEngine.js';
import { VoiceVoxEngine } from './VoiceVoxEngine.js';
import { WebSpeechEngine } from './WebSpeechEngine.js';
import { XaiEngine } from './XaiEngine.js';

const ENGINE_CONSTRUCTORS = {
  voicevox: VoiceVoxEngine,
  voicepeak: VoicePeakEngine,
  aivisSpeech: AivisSpeechEngine,
  aivisCloud: AivisCloudEngine,
  openai: OpenAiEngine,
  openRouter: OpenRouterEngine,
  xai: XaiEngine,
  unrealSpeech: UnrealSpeechEngine,
  elevenLabs: ElevenLabsEngine,
  fishAudio: FishAudioEngine,
  cartesia: CartesiaEngine,
  deepgram: DeepgramEngine,
  inworld: InworldEngine,
  gradium: GradiumEngine,
  geminiTts: GeminiTtsEngine,
  openaiCompatible: OpenAiCompatibleEngine,
  minimax: MinimaxEngine,
  piperPlus: PiperPlusEngine,
  webSpeech: WebSpeechEngine,
  none: NoneEngine,
} as const satisfies Record<VoiceEngineType, new () => VoiceEngine>;

/**
 * Voice engine factory
 * Generate appropriate voice engine instances based on voice engine type
 */
export class VoiceEngineFactory {
  /**
   * Get the voice engine for the specified engine type
   * @param engineType string of engine type ('voicevox', 'voicepeak', etc.)
   * @returns voice engine instance
   * @throws error if engine type is unknown
   */
  static getEngine(engineType: VoiceEngineType): VoiceEngine {
    const EngineConstructor = ENGINE_CONSTRUCTORS[engineType];
    if (!EngineConstructor) {
      throw new Error(`Unsupported voice engine type: ${engineType}`);
    }
    return new EngineConstructor();
  }
}
