import { createNeuralWorkingMemory, type NeuralMemoryEpisode } from '../src';

const episode = (id: string, vector: number[]): NeuralMemoryEpisode => ({
  id,
  vector,
  messages: [
    { role: 'user', content: `Question ${id}` },
    { role: 'assistant', content: `Answer ${id}` },
  ],
});
function fixture() {
  const memory = createNeuralWorkingMemory({ dimensions: 3, capacity: 3 });
  memory.remember(episode('a', [1, 0, 0]));
  memory.remember(episode('b', [0, 1, 0]));
  return memory;
}

describe('neural working memory', () => {
  it('changes recall through prior activity with the same bank and current query', () => {
    const memory = fixture();
    memory.observe([1, 0, 0]);
    const a = memory.recall([1, 1, 0], { maxEpisodes: 1 });
    memory.reset();
    memory.observe([0, 1, 0]);
    const b = memory.recall([1, 1, 0], { maxEpisodes: 1 });
    expect(a.episodes.map((e) => e.id)).toEqual(['a']);
    expect(b.episodes.map((e) => e.id)).toEqual(['b']);
    expect(a.activity.map((e) => e.similarity)).toEqual(
      b.activity.map((e) => e.similarity)
    );
    expect(a.activity.every((e) => e.spikes > 0)).toBe(true);
    memory.reset();
    memory.observe([1, 0, 0]);
    expect(memory.recall([1, 1, 0], { maxEpisodes: 1 })).toEqual(a);
  });

  it('preserves source and chronology even when activation ranks the later episode first', () => {
    const memory = fixture();
    memory.observe([0, 1, 0]);
    const result = memory.recall([1, 1, 0]);
    expect(result.activity[1].trace).toBeGreaterThan(result.activity[0].trace);
    expect(result.episodes).toEqual([
      { id: 'a', messages: episode('a', []).messages },
      { id: 'b', messages: episode('b', []).messages },
    ]);
    result.episodes[0].messages[0].content = 'Changed';
    result.activity[0].trace = 1e10;
    expect(memory.recall([1, 0, 0]).episodes[0].messages[0].content).toBe(
      'Question a'
    );
  });

  it('detaches inputs and allows a one-episode capacity with default recall options', () => {
    const memory = createNeuralWorkingMemory({ dimensions: 2, capacity: 1 });
    const source = episode('a', [1, 0]);
    memory.remember(source);
    source.messages[0].content = 'Changed';
    (source.vector as number[])[0] = 0;
    const result = memory.recall([1, 0]);
    expect(result.episodes[0].messages[0].content).toBe('Question a');
    expect(result.activity[0].similarity).toBe(1);
    expect(() => memory.remember(episode('b', [1, 0]))).toThrow('capacity');
    expect(memory.size).toBe(1);
  });

  it('does not recall irrelevant but active memories or cut source text to fit', () => {
    const memory = fixture();
    memory.observe([1, 0, 0]);
    expect(memory.recall([0, 0, 1]).episodes).toEqual([]);
    expect(memory.recall([1, 1, 0], { maxChars: 1 }).episodes).toEqual([]);
    expect(memory.recall([1, 1, 0], { maxEpisodes: 0 }).episodes).toEqual([]);
    expect(
      memory.recall([1, 1, 0], { excludeIds: ['a'] }).episodes.map((e) => e.id)
    ).toEqual(['b']);
    memory.remember({
      id: 'emoji',
      vector: [0, 0, 1],
      messages: [{ role: 'user', content: '🌱🌱' }],
    });
    expect(memory.recall([0, 0, 1], { maxChars: 2 }).episodes[0].id).toBe(
      'emoji'
    );
  });

  it('rejects malformed operations before they can change neural state', () => {
    const memory = fixture();
    const control = fixture();
    memory.observe([1, 0, 0]);
    control.observe([1, 0, 0]);
    for (const vector of [
      [0, 0, 0],
      [1],
      [Number.NaN, 0, 0],
      [Number.POSITIVE_INFINITY, 0, 0],
      new Array<number>(3),
    ]) {
      expect(() => memory.observe(vector)).toThrow();
      expect(() => memory.recall(vector)).toThrow();
    }
    expect(() => memory.recall([1, 0, 0], { maxChars: -1 })).toThrow();
    expect(() => memory.recall([1, 0, 0], { maxEpisodes: 4 })).toThrow();
    expect(() => memory.remember(episode('a', [1, 0, 0]))).toThrow();
    expect(() =>
      memory.remember({ ...episode('c', [1, 0, 0]), messages: [] })
    ).toThrow();
    expect(memory.recall([1, 1, 0])).toEqual(control.recall([1, 1, 0]));
  });

  it('removes forgotten content and residual activity, and can clear the bank', () => {
    const memory = fixture();
    memory.observe([1, 0, 0]);
    memory.forget('a');
    const fresh = createNeuralWorkingMemory({ dimensions: 3, capacity: 3 });
    fresh.remember(episode('b', [0, 1, 0]));
    expect(memory.recall([1, 1, 0])).toEqual(fresh.recall([1, 1, 0]));
    memory.remember(episode('c', [1, 0, 0]));
    expect(memory.recall([1, 1, 0]).episodes.map((e) => e.id)).toEqual([
      'b',
      'c',
    ]);
    memory.clear();
    expect(memory.size).toBe(0);
    expect(memory.recall([1, 0, 0])).toEqual({ episodes: [], activity: [] });
    memory.remember(episode('a', [1, 0, 0]));
    expect(memory.size).toBe(1);
  });

  it('lets new relevant evidence overcome an older bias without random choices', () => {
    const memory = fixture();
    memory.observe([1, 0, 0]);
    expect(memory.recall([1, 1, 0], { maxEpisodes: 1 }).episodes[0].id).toBe(
      'a'
    );
    for (let turn = 0; turn < 5; turn++) memory.observe([0, 1, 0]);
    expect(memory.recall([1, 1, 0], { maxEpisodes: 1 }).episodes[0].id).toBe(
      'b'
    );
  });

  it('validates finite resource limits', () => {
    for (const options of [
      { dimensions: 0 },
      { dimensions: 4097 },
      { dimensions: 1.5 },
      { dimensions: 2, capacity: 257 },
      { dimensions: 2, minSimilarity: Number.NaN },
    ])
      expect(() => createNeuralWorkingMemory(options)).toThrow();
  });
});
