import { describe, expect, it } from 'vitest';
import { ElevenLabsEngine } from '../src/engines/ElevenLabsEngine';
import { InworldEngine } from '../src/engines/InworldEngine';
import { PiperPlusEngine } from '../src/engines/PiperPlusEngine';
import { UnrealSpeechEngine } from '../src/engines/UnrealSpeechEngine';
import { VoiceEngineFactory } from '../src/engines/VoiceEngineFactory';

describe('VoiceEngineFactory', () => {
  it('should create a PiperPlus engine instance', () => {
    const engine = VoiceEngineFactory.getEngine('piperPlus');

    expect(engine).toBeInstanceOf(PiperPlusEngine);
  });

  it('should create an Unreal Speech engine instance', () => {
    const engine = VoiceEngineFactory.getEngine('unrealSpeech');

    expect(engine).toBeInstanceOf(UnrealSpeechEngine);
  });

  it('should create an ElevenLabs engine instance', () => {
    const engine = VoiceEngineFactory.getEngine('elevenLabs');

    expect(engine).toBeInstanceOf(ElevenLabsEngine);
  });

  it('should create an Inworld engine instance', () => {
    const engine = VoiceEngineFactory.getEngine('inworld');

    expect(engine).toBeInstanceOf(InworldEngine);
  });

  it('should throw for an unsupported engine type', () => {
    expect(() =>
      VoiceEngineFactory.getEngine('unsupported' as any),
    ).toThrowError('Unsupported voice engine type: unsupported');
  });
});
