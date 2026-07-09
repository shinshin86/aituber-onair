import { describe, expect, it } from 'vitest';
import { AivisCloudEngine } from '../src/engines/AivisCloudEngine';
import { AivisSpeechEngine } from '../src/engines/AivisSpeechEngine';
import { ElevenLabsEngine } from '../src/engines/ElevenLabsEngine';
import { GeminiTtsEngine } from '../src/engines/GeminiTtsEngine';
import { GradiumEngine } from '../src/engines/GradiumEngine';
import { InworldEngine } from '../src/engines/InworldEngine';
import { MinimaxEngine } from '../src/engines/MinimaxEngine';
import { NoneEngine } from '../src/engines/NoneEngine';
import { OpenAiEngine } from '../src/engines/OpenAiEngine';
import { OpenAiCompatibleEngine } from '../src/engines/OpenAiCompatibleEngine';
import { PiperPlusEngine } from '../src/engines/PiperPlusEngine';
import { UnrealSpeechEngine } from '../src/engines/UnrealSpeechEngine';
import { VoiceEngineFactory } from '../src/engines/VoiceEngineFactory';
import { VoicePeakEngine } from '../src/engines/VoicePeakEngine';
import { VoiceVoxEngine } from '../src/engines/VoiceVoxEngine';
import { WebSpeechEngine } from '../src/engines/WebSpeechEngine';
import { XaiEngine } from '../src/engines/XaiEngine';
import type { VoiceEngineType } from '../src/types/voiceEngine';

const expectedEngineConstructors = {
  voicevox: VoiceVoxEngine,
  voicepeak: VoicePeakEngine,
  openai: OpenAiEngine,
  xai: XaiEngine,
  unrealSpeech: UnrealSpeechEngine,
  elevenLabs: ElevenLabsEngine,
  inworld: InworldEngine,
  gradium: GradiumEngine,
  geminiTts: GeminiTtsEngine,
  openaiCompatible: OpenAiCompatibleEngine,
  aivisSpeech: AivisSpeechEngine,
  aivisCloud: AivisCloudEngine,
  minimax: MinimaxEngine,
  piperPlus: PiperPlusEngine,
  webSpeech: WebSpeechEngine,
  none: NoneEngine,
} as const satisfies Record<VoiceEngineType, new () => unknown>;

describe('VoiceEngineFactory', () => {
  it.each(Object.entries(expectedEngineConstructors))(
    'should create a %s engine instance',
    (engineType, EngineConstructor) => {
      const engine = VoiceEngineFactory.getEngine(
        engineType as VoiceEngineType,
      );

      expect(engine).toBeInstanceOf(EngineConstructor);
    },
  );

  it('should throw for an unsupported engine type', () => {
    expect(() =>
      VoiceEngineFactory.getEngine('unsupported' as any),
    ).toThrowError('Unsupported voice engine type: unsupported');
  });
});
