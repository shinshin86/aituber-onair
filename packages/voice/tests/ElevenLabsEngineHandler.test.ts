import { describe, expect, it, vi } from 'vitest';
import { elevenLabsEngineHandler } from '../src/services/internal/engineHandlers/elevenLabs';

describe('elevenLabsEngineHandler', () => {
  it('should apply configurable engine options', () => {
    const engine = {
      fetchAudio: vi.fn(),
      getTestMessage: vi.fn(),
      setApiEndpoint: vi.fn(),
      setModel: vi.fn(),
      setOutputFormat: vi.fn(),
      setLanguageCode: vi.fn(),
      setVoiceSettings: vi.fn(),
      setStability: vi.fn(),
      setSimilarityBoost: vi.fn(),
      setStyle: vi.fn(),
      setUseSpeakerBoost: vi.fn(),
      setSpeed: vi.fn(),
      setSeed: vi.fn(),
      setPreviousText: vi.fn(),
      setNextText: vi.fn(),
      setApplyTextNormalization: vi.fn(),
      setApplyLanguageTextNormalization: vi.fn(),
      setEnableLogging: vi.fn(),
    };

    elevenLabsEngineHandler.applyOptions(engine as any, {
      engineType: 'elevenLabs',
      speaker: 'JBFqnCBsd6RMkjVDRZzb',
      elevenLabsApiUrl: 'https://example.com/v1/text-to-speech',
      elevenLabsModel: 'eleven_flash_v2_5',
      elevenLabsOutputFormat: 'mp3_22050_32',
      elevenLabsLanguageCode: 'ja',
      elevenLabsVoiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
      elevenLabsStability: 0.4,
      elevenLabsSimilarityBoost: 0.8,
      elevenLabsStyle: 0.1,
      elevenLabsUseSpeakerBoost: true,
      elevenLabsSpeed: 1.05,
      elevenLabsSeed: 123,
      elevenLabsPreviousText: 'previous',
      elevenLabsNextText: 'next',
      elevenLabsApplyTextNormalization: 'auto',
      elevenLabsApplyLanguageTextNormalization: false,
      elevenLabsEnableLogging: false,
    });

    expect(engine.setApiEndpoint).toHaveBeenCalledWith(
      'https://example.com/v1/text-to-speech',
    );
    expect(engine.setModel).toHaveBeenCalledWith('eleven_flash_v2_5');
    expect(engine.setOutputFormat).toHaveBeenCalledWith('mp3_22050_32');
    expect(engine.setLanguageCode).toHaveBeenCalledWith('ja');
    expect(engine.setVoiceSettings).toHaveBeenCalledWith({
      stability: 0.5,
      similarityBoost: 0.75,
    });
    expect(engine.setStability).toHaveBeenCalledWith(0.4);
    expect(engine.setSimilarityBoost).toHaveBeenCalledWith(0.8);
    expect(engine.setStyle).toHaveBeenCalledWith(0.1);
    expect(engine.setUseSpeakerBoost).toHaveBeenCalledWith(true);
    expect(engine.setSpeed).toHaveBeenCalledWith(1.05);
    expect(engine.setSeed).toHaveBeenCalledWith(123);
    expect(engine.setPreviousText).toHaveBeenCalledWith('previous');
    expect(engine.setNextText).toHaveBeenCalledWith('next');
    expect(engine.setApplyTextNormalization).toHaveBeenCalledWith('auto');
    expect(engine.setApplyLanguageTextNormalization).toHaveBeenCalledWith(
      false,
    );
    expect(engine.setEnableLogging).toHaveBeenCalledWith(false);
  });

  it('should expose allowed update keys', () => {
    expect(elevenLabsEngineHandler.allowedUpdateKeys).toEqual([
      'elevenLabsApiUrl',
      'elevenLabsModel',
      'elevenLabsOutputFormat',
      'elevenLabsLanguageCode',
      'elevenLabsVoiceSettings',
      'elevenLabsStability',
      'elevenLabsSimilarityBoost',
      'elevenLabsStyle',
      'elevenLabsUseSpeakerBoost',
      'elevenLabsSpeed',
      'elevenLabsSeed',
      'elevenLabsPreviousText',
      'elevenLabsNextText',
      'elevenLabsApplyTextNormalization',
      'elevenLabsApplyLanguageTextNormalization',
      'elevenLabsEnableLogging',
    ]);
  });

  it('should merge update values with current options', () => {
    const result = elevenLabsEngineHandler.mergeOptions(
      {
        engineType: 'elevenLabs',
        speaker: 'JBFqnCBsd6RMkjVDRZzb',
        elevenLabsModel: 'eleven_multilingual_v2',
      },
      {
        elevenLabsSpeed: 1.05,
      },
    );

    expect(result).toEqual({
      engineType: 'elevenLabs',
      speaker: 'JBFqnCBsd6RMkjVDRZzb',
      elevenLabsModel: 'eleven_multilingual_v2',
      elevenLabsSpeed: 1.05,
    });
  });
});
