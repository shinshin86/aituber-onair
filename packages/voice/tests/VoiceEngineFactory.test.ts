import { describe, expect, it } from 'vitest';
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

  it('should throw for an unsupported engine type', () => {
    expect(() =>
      VoiceEngineFactory.getEngine('unsupported' as any),
    ).toThrowError('Unsupported voice engine type: unsupported');
  });
});
