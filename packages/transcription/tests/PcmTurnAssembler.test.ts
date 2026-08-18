import { PcmTurnAssembler } from '../src/providers/PcmTurnAssembler';

function createAssembler(
  overrides: Partial<ConstructorParameters<typeof PcmTurnAssembler>[0]> = {}
) {
  return new PcmTurnAssembler({
    sampleRate: 1000,
    rmsThreshold: 0.015,
    minSpeechDurationMs: 100,
    silenceDurationMs: 50,
    preRollMs: 200,
    maxUtteranceMs: 30_000,
    ...overrides,
  });
}

describe('PcmTurnAssembler', () => {
  it('prepends only the configured rolling pre-roll', () => {
    const assembler = createAssembler();
    assembler.pushChunk(new Float32Array(300).fill(0.001));
    assembler.pushChunk(new Float32Array(100).fill(0.1));

    const turns = assembler.pushChunk(new Float32Array(50));

    expect(turns).toHaveLength(1);
    expect(turns[0]?.audio).toHaveLength(250);
    expect(turns[0]?.audio.slice(0, 100)).toEqual(
      new Float32Array(100).fill(0.001)
    );
    expect(turns[0]?.audio.slice(100, 200)).toEqual(
      new Float32Array(100).fill(0.1)
    );
    expect(turns[0]?.confirmedSpeechDurationMs).toBe(100);
  });

  it('force-finalizes at the maximum duration and continues speech', () => {
    const assembler = createAssembler({
      preRollMs: 0,
      maxUtteranceMs: 300,
    });
    assembler.pushChunk(new Float32Array(100).fill(0.1));

    const forcedTurns = assembler.pushChunk(new Float32Array(250).fill(0.1));
    const finalTurns = assembler.pushChunk(new Float32Array(50));

    expect(forcedTurns).toHaveLength(1);
    expect(forcedTurns[0]?.audio).toHaveLength(300);
    expect(forcedTurns[0]?.confirmedSpeechDurationMs).toBe(300);
    expect(finalTurns).toHaveLength(1);
    expect(finalTurns[0]?.audio).toHaveLength(100);
    expect(finalTurns[0]?.confirmedSpeechDurationMs).toBe(50);
  });

  it('flushes confirmed speech and drops an unconfirmed candidate', () => {
    const confirmed = createAssembler({ preRollMs: 0 });
    confirmed.pushChunk(new Float32Array(100).fill(0.1));

    const confirmedTurns = confirmed.flush();

    expect(confirmedTurns).toHaveLength(1);
    expect(confirmedTurns[0]?.audio).toHaveLength(100);

    const unconfirmed = createAssembler({
      preRollMs: 0,
      minSpeechDurationMs: 150,
    });
    unconfirmed.pushChunk(new Float32Array(100).fill(0.1));

    expect(unconfirmed.flush()).toEqual([]);
  });
});
