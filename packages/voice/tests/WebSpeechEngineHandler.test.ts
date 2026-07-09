import { describe, expect, it, vi } from 'vitest';
import { webSpeechEngineHandler } from '../src/services/internal/engineHandlers/webSpeech';

describe('webSpeechEngineHandler', () => {
  it('applies Web Speech options to the engine', () => {
    const engine = {
      setRate: vi.fn(),
      setPitch: vi.fn(),
      setVolume: vi.fn(),
      setLanguage: vi.fn(),
    };

    webSpeechEngineHandler.applyOptions(engine as any, {
      engineType: 'webSpeech',
      speaker: 'Kyoko',
      webSpeechRate: 1.25,
      webSpeechPitch: 1.1,
      webSpeechVolume: 0.9,
      webSpeechLanguage: 'ja-JP',
    });

    expect(engine.setRate).toHaveBeenCalledWith(1.25);
    expect(engine.setPitch).toHaveBeenCalledWith(1.1);
    expect(engine.setVolume).toHaveBeenCalledWith(0.9);
    expect(engine.setLanguage).toHaveBeenCalledWith('ja-JP');
  });

  it('exposes allowed update keys and merges options', () => {
    expect(webSpeechEngineHandler.allowedUpdateKeys).toEqual([
      'webSpeechRate',
      'webSpeechPitch',
      'webSpeechVolume',
      'webSpeechLanguage',
    ]);

    expect(
      webSpeechEngineHandler.mergeOptions(
        {
          engineType: 'webSpeech',
          speaker: 'Kyoko',
          webSpeechRate: 1,
        },
        {
          webSpeechRate: 1.4,
        },
      ),
    ).toEqual({
      engineType: 'webSpeech',
      speaker: 'Kyoko',
      webSpeechRate: 1.4,
    });
  });
});
