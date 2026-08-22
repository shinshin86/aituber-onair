import { describe, expect, it } from 'vitest';
import { AITuberOnAirCore } from '../../src/core/AITuberOnAirCore';

describe('AITuberOnAirCore Spanish speech chunking', () => {
  it('splits a paragraph into ordered Spanish phrases', () => {
    const core = Object.create(AITuberOnAirCore.prototype) as {
      speechChunkEnabled: boolean;
      speechChunkMinWords: number;
      speechChunkLocale: string;
      speechChunkSeparators?: string[];
      splitTextForSpeech(text: string): string[];
    };
    core.speechChunkEnabled = true;
    core.speechChunkMinWords = 0;
    core.speechChunkLocale = 'es';
    core.speechChunkSeparators = undefined;

    expect(
      core.splitTextForSpeech(
        'Primera frase. Segunda pregunta? Tercera idea; Final!',
      ),
    ).toEqual([
      'Primera frase.',
      'Segunda pregunta?',
      'Tercera idea;',
      'Final!',
    ]);
  });
});
