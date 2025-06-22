import { VoiceEngine } from './VoiceEngine';
import { VoiceVoxEngine } from './VoiceVoxEngine';
import { VoicePeakEngine } from './VoicePeakEngine';
import { AivisSpeechEngine } from './AivisSpeechEngine';
import { OpenAiEngine } from './OpenAiEngine';
import { NijiVoiceEngine } from './NijiVoiceEngine';
import { MinimaxEngine } from './MinimaxEngine';
import { NoneEngine } from './NoneEngine';
import { VoiceEngineType } from '../../../types';
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
    switch (engineType) {
      case 'voicevox':
        return new VoiceVoxEngine();
      case 'voicepeak':
        return new VoicePeakEngine();
      case 'aivisSpeech':
        return new AivisSpeechEngine();
      case 'openai':
        return new OpenAiEngine();
      case 'nijivoice':
        return new NijiVoiceEngine();
      case 'minimax':
        return new MinimaxEngine();
      case 'none':
        return new NoneEngine();
      default:
        throw new Error(`Unsupported voice engine type: ${engineType}`);
    }
  }
}
