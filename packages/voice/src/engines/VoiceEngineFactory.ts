import { VoiceEngineType } from '../types/voiceEngine';
import { AivisCloudEngine } from './AivisCloudEngine';
import { AivisSpeechEngine } from './AivisSpeechEngine';
import { ElevenLabsEngine } from './ElevenLabsEngine';
import { GeminiTtsEngine } from './GeminiTtsEngine';
import { GradiumEngine } from './GradiumEngine';
import { InworldEngine } from './InworldEngine';
import { MinimaxEngine } from './MinimaxEngine';
import { NoneEngine } from './NoneEngine';
import { OpenAiEngine } from './OpenAiEngine';
import { OpenAiCompatibleEngine } from './OpenAiCompatibleEngine';
import { PiperPlusEngine } from './PiperPlusEngine';
import { UnrealSpeechEngine } from './UnrealSpeechEngine';
import { VoiceEngine } from './VoiceEngine';
import { VoicePeakEngine } from './VoicePeakEngine';
import { VoiceVoxEngine } from './VoiceVoxEngine';
import { WebSpeechEngine } from './WebSpeechEngine';
import { XaiEngine } from './XaiEngine';

const ENGINE_CONSTRUCTORS = {
  voicevox: VoiceVoxEngine,
  voicepeak: VoicePeakEngine,
  aivisSpeech: AivisSpeechEngine,
  aivisCloud: AivisCloudEngine,
  openai: OpenAiEngine,
  xai: XaiEngine,
  unrealSpeech: UnrealSpeechEngine,
  elevenLabs: ElevenLabsEngine,
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
