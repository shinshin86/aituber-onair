import type { SpeechChunkingOptions } from '@aituber-onair/core';

export function buildSpeechPipelineOptions(
  enabled: boolean,
): SpeechChunkingOptions {
  return {
    enabled,
    locale: 'es',
    minWords: 0,
  };
}
