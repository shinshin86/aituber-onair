import { describe, expect, it } from 'vitest';
import {
  AIVIS_CLOUD_API_URL,
  OPENAI_COMPATIBLE_TTS_API_URL,
  AivisCloudEngine,
  OpenAiCompatibleEngine,
} from '../src/index';

describe('Core index voice re-exports', () => {
  it('re-exports voice engine classes', () => {
    expect(typeof AivisCloudEngine).toBe('function');
    expect(typeof OpenAiCompatibleEngine).toBe('function');
  });

  it('re-exports voice endpoint constants', () => {
    expect(AIVIS_CLOUD_API_URL).toBe(
      'https://api.aivis-project.com/v1/tts/synthesize',
    );
    expect(OPENAI_COMPATIBLE_TTS_API_URL).toBe(
      'http://localhost:8880/v1/audio/speech',
    );
  });
});
