import { describe, expect, it } from 'vitest';
import * as voicePackage from '../src';
import type {
  GradiumOutputFormat,
  GradiumVoiceServiceOptions,
  InworldVoiceServiceOptions,
  PiperPlusAssets,
  PiperPlusVoiceServiceOptions,
  WebSpeechVoiceServiceOptions,
} from '../src';
import { EmotionParser, VoiceEngineAdapter, textToScreenplay } from '../src';

describe('Voice Package Exports', () => {
  it('should export VoiceEngineAdapter', () => {
    expect(VoiceEngineAdapter).toBeDefined();
    expect(typeof VoiceEngineAdapter).toBe('function');
  });

  it('should export textToScreenplay utility', () => {
    expect(textToScreenplay).toBeDefined();
    expect(typeof textToScreenplay).toBe('function');
  });

  it('should export EmotionParser utility', () => {
    expect(EmotionParser).toBeDefined();
    expect(typeof EmotionParser).toBe('function');
  });

  it('should preserve the main engine exports', () => {
    expect(voicePackage.VoiceEngineFactory).toBeDefined();
    expect(voicePackage.VoiceVoxEngine).toBeDefined();
    expect(voicePackage.VoicePeakEngine).toBeDefined();
    expect(voicePackage.AivisSpeechEngine).toBeDefined();
    expect(voicePackage.AivisCloudEngine).toBeDefined();
    expect(voicePackage.OpenAiEngine).toBeDefined();
    expect(voicePackage.XaiEngine).toBeDefined();
    expect(voicePackage.UnrealSpeechEngine).toBeDefined();
    expect(voicePackage.ElevenLabsEngine).toBeDefined();
    expect(voicePackage.InworldEngine).toBeDefined();
    expect(voicePackage.GradiumEngine).toBeDefined();
    expect(voicePackage.GeminiTtsEngine).toBeDefined();
    expect(voicePackage.OpenAiCompatibleEngine).toBeDefined();
    expect(voicePackage.MinimaxEngine).toBeDefined();
    expect(voicePackage.PiperPlusEngine).toBeDefined();
    expect(voicePackage.WebSpeechEngine).toBeDefined();
  });

  it('should keep NoneEngine out of the public engine exports', () => {
    expect('NoneEngine' in voicePackage).toBe(false);
  });

  it('should expose PiperPlus public types through the package root', () => {
    const assets: PiperPlusAssets = {
      basePath: '/piper/',
      modelConfigFile: 'model.json',
      modelFile: 'model.onnx',
      voiceFile: 'voice.htsvoice',
    };
    const options: PiperPlusVoiceServiceOptions = {
      engineType: 'piperPlus',
      speaker: 'tsukuyomi',
      piperPlusSpeed: 1.1,
      piperPlusNoiseScale: 0.7,
    };

    expect(assets.modelFile).toBe('model.onnx');
    expect(options.engineType).toBe('piperPlus');
  });

  it('should expose Web Speech public types through the package root', () => {
    const options: WebSpeechVoiceServiceOptions = {
      engineType: 'webSpeech',
      speaker: 'Kyoko',
      webSpeechRate: 1.2,
      webSpeechLanguage: 'ja-JP',
    };

    expect(options.engineType).toBe('webSpeech');
  });

  it('should expose Inworld public types through the package root', () => {
    const options: InworldVoiceServiceOptions = {
      engineType: 'inworld',
      speaker: 'Ashley',
      apiKey: 'inworld-basic-key',
      inworldModel: 'inworld-tts-2',
      inworldAudioEncoding: 'MP3',
      inworldSampleRateHertz: 48000,
    };

    expect(options.engineType).toBe('inworld');
  });

  it('should expose Gradium public types through the package root', () => {
    const outputFormat: GradiumOutputFormat = 'wav';
    const options: GradiumVoiceServiceOptions = {
      engineType: 'gradium',
      speaker: 'YTpq7expH9539ERJ',
      apiKey: 'gradium-api-key',
      gradiumOutputFormat: outputFormat,
      gradiumTemperature: 0.3,
    };

    expect(options.engineType).toBe('gradium');
  });
});

describe('textToScreenplay', () => {
  it('should convert text to screenplay format', () => {
    const result = textToScreenplay('[happy] Hello there!');
    expect(result).toEqual({
      emotion: 'happy',
      text: 'Hello there!',
    });
  });

  it('should handle text without emotion tags', () => {
    const result = textToScreenplay('Hello there!');
    expect(result).toEqual({
      text: 'Hello there!',
    });
  });
});

describe('EmotionParser', () => {
  it('should extract emotion from text', () => {
    const result = EmotionParser.extractEmotion('[happy] Hello!');
    expect(result).toEqual({
      emotion: 'happy',
      cleanText: 'Hello!',
    });
  });

  it('should return clean text when no emotion', () => {
    const result = EmotionParser.extractEmotion('Hello!');
    expect(result).toEqual({
      cleanText: 'Hello!',
    });
  });

  it('should validate emotions', () => {
    expect(EmotionParser.isValidEmotion('happy')).toBe(true);
    expect(EmotionParser.isValidEmotion('invalid')).toBe(false);
  });
});
