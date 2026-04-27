import { describe, expect, it, vi } from 'vitest';
import { unrealSpeechEngineHandler } from '../src/services/internal/engineHandlers/unrealSpeech';

describe('unrealSpeechEngineHandler', () => {
  it('should apply configurable engine options', () => {
    const engine = {
      fetchAudio: vi.fn(),
      getTestMessage: vi.fn(),
      setApiEndpoint: vi.fn(),
      setBitrate: vi.fn(),
      setSpeed: vi.fn(),
      setPitch: vi.fn(),
      setCodec: vi.fn(),
      setTemperature: vi.fn(),
    };

    unrealSpeechEngineHandler.applyOptions(engine as any, {
      engineType: 'unrealSpeech',
      speaker: 'af_bella',
      unrealSpeechApiUrl: 'https://example.com/stream',
      unrealSpeechBitrate: '320k',
      unrealSpeechSpeed: 0.4,
      unrealSpeechPitch: 1.15,
      unrealSpeechCodec: 'pcm_s16le',
      unrealSpeechTemperature: 0.35,
    });

    expect(engine.setApiEndpoint).toHaveBeenCalledWith(
      'https://example.com/stream',
    );
    expect(engine.setBitrate).toHaveBeenCalledWith('320k');
    expect(engine.setSpeed).toHaveBeenCalledWith(0.4);
    expect(engine.setPitch).toHaveBeenCalledWith(1.15);
    expect(engine.setCodec).toHaveBeenCalledWith('pcm_s16le');
    expect(engine.setTemperature).toHaveBeenCalledWith(0.35);
  });

  it('should expose allowed update keys', () => {
    expect(unrealSpeechEngineHandler.allowedUpdateKeys).toEqual([
      'unrealSpeechApiUrl',
      'unrealSpeechBitrate',
      'unrealSpeechSpeed',
      'unrealSpeechPitch',
      'unrealSpeechCodec',
      'unrealSpeechTemperature',
    ]);
  });

  it('should merge update values with current options', () => {
    const result = unrealSpeechEngineHandler.mergeOptions(
      {
        engineType: 'unrealSpeech',
        speaker: 'af_bella',
        unrealSpeechSpeed: 0,
      },
      {
        unrealSpeechPitch: 1.1,
      },
    );

    expect(result).toEqual({
      engineType: 'unrealSpeech',
      speaker: 'af_bella',
      unrealSpeechSpeed: 0,
      unrealSpeechPitch: 1.1,
    });
  });
});
