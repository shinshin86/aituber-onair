import { describe, expect, it } from 'vitest';
import * as voicePackage from '../src';
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
    expect(voicePackage.OpenAiCompatibleEngine).toBeDefined();
    expect(voicePackage.MinimaxEngine).toBeDefined();
  });

  it('should keep NoneEngine out of the public engine exports', () => {
    expect('NoneEngine' in voicePackage).toBe(false);
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
