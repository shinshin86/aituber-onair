/** A source-backed episode. Store complete exchanges rather than orphaned replies. */
export interface NeuralMemoryEpisode {
  id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Caller-supplied embedding; use the same encoder for episodes and queries. */
  vector: readonly number[];
}

export interface NeuralMemoryRecall {
  /** Selected episodes, in their original insertion order. No text is rewritten. */
  episodes: Omit<NeuralMemoryEpisode, 'vector'>[];
  /** Detached numerical evidence, not a language-quality score. */
  activity: Array<{
    id: string;
    similarity: number;
    spikes: number;
    trace: number;
    selected: boolean;
  }>;
}

export interface NeuralWorkingMemory {
  remember(episode: NeuralMemoryEpisode): void;
  /** Advance the circuit without sending this stimulus or its text to an LLM. */
  observe(vector: readonly number[]): void;
  /** Advance with the current query, then read out relevant active episodes. */
  recall(
    vector: readonly number[],
    options?: { maxEpisodes?: number; maxChars?: number; excludeIds?: string[] }
  ): NeuralMemoryRecall;
  /** Reset neural state while retaining the episode bank. */
  reset(): void;
  /** Forget an episode and reset residual state to remove its influence. */
  forget(id: string): void;
  /** Remove every episode, embedding and neural state. */
  clear(): void;
  readonly size: number;
}

/**
 * Experimental associative spiking memory, independent of a language provider.
 * One abstract LIF unit per episode, similarity-weighted recurrent excitation,
 * shared inhibition, refractory periods and a slowly decaying synaptic trace.
 * This is a designed circuit, not a fly reconstruction or an LLM activation hook.
 * No I/O, model, automatic embedding, clock, per-turn randomness or persistence.
 */
export function createNeuralWorkingMemory(options: {
  dimensions: number;
  capacity?: number;
  minSimilarity?: number;
}): NeuralWorkingMemory {
  const { dimensions } = options;
  const capacity = options.capacity ?? 64;
  const minSimilarity = options.minSimilarity ?? 0.15;
  if (
    !Number.isInteger(dimensions) ||
    dimensions < 1 ||
    dimensions > 4096 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 256 ||
    !Number.isFinite(minSimilarity) ||
    minSimilarity < 0 ||
    minSimilarity > 1
  )
    throw new Error('Invalid neural working memory options');

  type Stored = NeuralMemoryEpisode & { order: number };
  const bank: Array<Stored | undefined> = Array(capacity).fill(undefined);
  const voltage = new Float64Array(capacity);
  const trace = new Float64Array(capacity);
  const pending = new Float64Array(capacity);
  const refractory = new Uint8Array(capacity);
  const links = new Float64Array(capacity * capacity);
  let order = 0;

  function normalized(values: readonly number[]): number[] {
    if (
      !Array.isArray(values) ||
      values.length !== dimensions ||
      !values.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e6)
    )
      throw new Error('Invalid memory vector');
    const norm = Math.hypot(...values);
    if (!Number.isFinite(norm) || norm === 0)
      throw new Error('Memory vector must be finite and nonzero');
    return values.map((v) => v / norm);
  }

  function similarity(a: readonly number[], b: readonly number[]): number {
    return Math.max(
      0,
      Math.min(
        1,
        a.reduce((sum, v, i) => sum + v * b[i], 0)
      )
    );
  }

  function reset() {
    voltage.fill(0);
    trace.fill(0);
    pending.fill(0);
    refractory.fill(0);
  }

  function advance(query: number[]) {
    const relevance = bank.map((e) => (e ? similarity(query, e.vector) : 0));
    const spikes = new Uint32Array(capacity);
    const active = bank.flatMap((entry, i) => (entry ? [i] : []));
    // Fixed computation per event; these are simulation ticks, not wall time.
    for (let tick = 0; tick < 24; tick++) {
      const fired: number[] = [];
      const inhibition =
        (active.reduce((sum, i) => sum + trace[i], 0) /
          Math.max(1, active.length)) *
        0.025;
      for (const i of active) {
        trace[i] *= Math.exp(-1 / 80);
        if (refractory[i]) {
          refractory[i]--;
          pending[i] = 0;
          continue;
        }
        voltage[i] = Math.max(
          -1,
          Math.min(
            3,
            0.9 * voltage[i] +
              0.42 * relevance[i] +
              0.12 * trace[i] +
              pending[i] -
              inhibition
          )
        );
        pending[i] = 0;
        if (voltage[i] >= 1) {
          voltage[i] = 0;
          refractory[i] = 2;
          trace[i] = Math.min(2, trace[i] + 0.08);
          spikes[i]++;
          fired.push(i);
        }
      }
      for (const target of active) {
        const mass = active.reduce(
          (sum, source) => sum + links[source * capacity + target],
          0
        );
        for (const source of fired)
          pending[target] +=
            (0.12 * links[source * capacity + target]) / Math.max(1, mass);
      }
    }
    return { relevance, spikes };
  }

  return {
    get size() {
      return bank.filter(Boolean).length;
    },
    remember(episode) {
      const vector = normalized(episode.vector);
      if (
        typeof episode.id !== 'string' ||
        !episode.id.trim() ||
        episode.id.length > 200 ||
        !Array.isArray(episode.messages) ||
        !episode.messages.length ||
        episode.messages.length > 16 ||
        !Array.from(episode.messages).every(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0
        ) ||
        episode.messages.reduce((sum, m) => sum + m.content.length, 0) > 16000
      )
        throw new Error('Invalid memory episode');
      if (bank.some((e) => e?.id === episode.id))
        throw new Error('Duplicate memory id');
      const slot = bank.findIndex((e) => !e);
      if (slot < 0) throw new Error('Neural memory capacity reached');
      const copy: Stored = {
        id: episode.id,
        vector,
        order: order++,
        messages: episode.messages.map(({ role, content }) => ({
          role,
          content,
        })),
      };
      bank[slot] = copy;
      for (let i = 0; i < capacity; i++) {
        const other = bank[i];
        const weight =
          i !== slot && other ? similarity(vector, other.vector) ** 2 : 0;
        links[slot * capacity + i] = weight;
        links[i * capacity + slot] = weight;
      }
    },
    observe(vector) {
      advance(normalized(vector));
    },
    recall(vector, settings = {}) {
      const query = normalized(vector);
      const maxEpisodes = settings.maxEpisodes ?? Math.min(3, capacity);
      const maxChars = settings.maxChars ?? 2000;
      if (
        !Number.isInteger(maxEpisodes) ||
        maxEpisodes < 0 ||
        maxEpisodes > capacity ||
        !Number.isInteger(maxChars) ||
        maxChars < 0 ||
        maxChars > 64000 ||
        (settings.excludeIds !== undefined &&
          (!Array.isArray(settings.excludeIds) ||
            !settings.excludeIds.every((id) => typeof id === 'string')))
      )
        throw new Error('Invalid recall budget');
      const { relevance, spikes } = advance(query);
      const excluded = new Set(settings.excludeIds);
      const ranked = bank.flatMap((e, i) =>
        e &&
        !excluded.has(e.id) &&
        relevance[i] >= minSimilarity &&
        trace[i] > 0
          ? [{ entry: e, i }]
          : []
      );
      ranked.sort(
        (a, b) =>
          trace[b.i] - trace[a.i] ||
          relevance[b.i] - relevance[a.i] ||
          a.entry.order - b.entry.order
      );
      const picked: typeof ranked = [];
      let chars = 0;
      for (const candidate of ranked) {
        const size = candidate.entry.messages.reduce(
          (sum, m) => sum + [...m.content].length,
          0
        );
        if (picked.length < maxEpisodes && chars + size <= maxChars) {
          picked.push(candidate);
          chars += size;
        }
      }
      const selected = new Set(picked.map((p) => p.i));
      return {
        episodes: picked
          .sort((a, b) => a.entry.order - b.entry.order)
          .map(({ entry }) => ({
            id: entry.id,
            messages: entry.messages.map((m) => ({ ...m })),
          })),
        activity: bank.flatMap((entry, i) =>
          entry
            ? [
                {
                  id: entry.id,
                  similarity: relevance[i],
                  spikes: spikes[i],
                  trace: trace[i],
                  selected: selected.has(i),
                },
              ]
            : []
        ),
      };
    },
    reset,
    forget(id) {
      const slot = bank.findIndex((e) => e?.id === id);
      if (slot < 0) return;
      bank[slot] = undefined;
      for (let i = 0; i < capacity; i++) {
        links[slot * capacity + i] = 0;
        links[i * capacity + slot] = 0;
      }
      reset();
    },
    clear() {
      bank.fill(undefined);
      links.fill(0);
      order = 0;
      reset();
    },
  };
}
