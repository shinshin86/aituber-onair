import { describe, expect, it } from 'vitest';
import { buildSpeechPipelineOptions } from './ttsSentencePipeline';

describe('TTS sentence pipeline', () => {
  it('enables Spanish sentence chunks without merging them back together', () => {
    expect(buildSpeechPipelineOptions(true)).toEqual({
      enabled: true,
      locale: 'es',
      minWords: 0,
    });
  });

  it('can be disabled from VTuber settings', () => {
    expect(buildSpeechPipelineOptions(false).enabled).toBe(false);
  });
});
