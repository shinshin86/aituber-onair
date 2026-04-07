import { describe, expect, it, vi } from 'vitest';
import type { PiperPlusAssets } from '../src/engines';
import { piperPlusEngineHandler } from '../src/services/internal/engineHandlers/piperPlus';

describe('piperPlusEngineHandler', () => {
  const assets: PiperPlusAssets = {
    basePath: 'https://example.com/piper/',
    modelConfigFile: 'model.json',
    modelFile: 'model.onnx',
    voiceFile: 'voice.htsvoice',
  };

  it('should apply configurable engine options', () => {
    const engine = {
      fetchAudio: vi.fn(),
      getTestMessage: vi.fn(),
      setAssets: vi.fn(),
      setSpeed: vi.fn(),
      setNoiseScale: vi.fn(),
    };

    piperPlusEngineHandler.applyOptions(engine as any, {
      engineType: 'piperPlus',
      speaker: 'tsukuyomi',
      piperPlusBasePath: assets.basePath,
      piperPlusModelConfigFile: assets.modelConfigFile,
      piperPlusModelFile: assets.modelFile,
      piperPlusVoiceFile: assets.voiceFile,
      piperPlusSpeed: 1.15,
      piperPlusNoiseScale: 0.65,
    });

    expect(engine.setAssets).toHaveBeenCalledWith(assets);
    expect(engine.setSpeed).toHaveBeenCalledWith(1.15);
    expect(engine.setNoiseScale).toHaveBeenCalledWith(0.65);
  });

  it('should expose allowed update keys', () => {
    expect(piperPlusEngineHandler.allowedUpdateKeys).toEqual([
      'piperPlusBasePath',
      'piperPlusModelConfigFile',
      'piperPlusModelFile',
      'piperPlusVoiceFile',
      'piperPlusSpeed',
      'piperPlusNoiseScale',
    ]);
  });

  it('should merge update values with current options', () => {
    const result = piperPlusEngineHandler.mergeOptions(
      {
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        piperPlusBasePath: assets.basePath,
        piperPlusModelConfigFile: assets.modelConfigFile,
        piperPlusModelFile: assets.modelFile,
        piperPlusVoiceFile: assets.voiceFile,
        piperPlusSpeed: 1.0,
      },
      {
        piperPlusNoiseScale: 0.75,
      },
    );

    expect(result).toEqual({
      engineType: 'piperPlus',
      speaker: 'tsukuyomi',
      piperPlusBasePath: assets.basePath,
      piperPlusModelConfigFile: assets.modelConfigFile,
      piperPlusModelFile: assets.modelFile,
      piperPlusVoiceFile: assets.voiceFile,
      piperPlusSpeed: 1.0,
      piperPlusNoiseScale: 0.75,
    });
  });
});
