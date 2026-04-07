import { describe, expect, it } from 'vitest';
import { PiperPlusEngine } from '../src/engines/PiperPlusEngine';
import { VoiceEngineFactory } from '../src/engines/VoiceEngineFactory';

describe('VoiceEngineFactory', () => {
  it('should create a PiperPlus engine instance', () => {
    const engine = VoiceEngineFactory.getEngine('piperPlus');

    expect(engine).toBeInstanceOf(PiperPlusEngine);
  });

  it('should throw for an unsupported engine type', () => {
    expect(() =>
      VoiceEngineFactory.getEngine('unsupported' as any),
    ).toThrowError('Unsupported voice engine type: unsupported');
  });
});
