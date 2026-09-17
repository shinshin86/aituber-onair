import type { BrainGraph } from './graph.js';

export interface BrainSimulator {
  reset(): void;
  clearCounts(): void;
  stimulate(indexes: Uint32Array, amount: number): void;
  run(options: { steps: number; dtMs: number }): void;
  /** Copies cumulative spike counts; call only when an observer needs them. */
  snapshot(): Uint32Array;
  readonly spikeCounts: Uint32Array;
}

/** Approximate discrete LIF with one-step synaptic delay and a 2 ms refractory period. */
export function createBrainSimulator(graph: BrainGraph): BrainSimulator {
  const n = graph.bodyIds.length;
  const potential = new Float32Array(n);
  const pending = new Float32Array(n);
  const refractory = new Float32Array(n);
  const active = new Uint32Array(n);
  const spikeCounts = new Uint32Array(n);
  return {
    spikeCounts,
    clearCounts() {
      spikeCounts.fill(0);
    },
    reset() {
      potential.fill(0);
      pending.fill(0);
      refractory.fill(0);
      spikeCounts.fill(0);
    },
    stimulate(indexes, amount) {
      if (!Number.isFinite(amount) || amount < 0 || amount > 4)
        throw new Error('Invalid stimulus');
      for (const i of indexes) {
        if (i >= n) throw new Error('Invalid stimulus index');
        potential[i] = Math.min(4, potential[i] + amount);
      }
    },
    run({ steps, dtMs }) {
      if (
        !Number.isInteger(steps) ||
        steps < 1 ||
        steps > 1000 ||
        !Number.isFinite(dtMs) ||
        dtMs <= 0 ||
        dtMs > 5
      ) {
        throw new Error('Invalid simulation window');
      }
      const leak = Math.exp(-dtMs / 20);
      for (let step = 0; step < steps; step++) {
        let count = 0;
        for (let i = 0; i < n; i++) {
          if (refractory[i] > 0) {
            refractory[i] = Math.max(0, refractory[i] - dtMs);
            pending[i] = 0;
            continue;
          }
          potential[i] = Math.max(
            -2,
            Math.min(4, potential[i] * leak + pending[i])
          );
          pending[i] = 0;
          if (potential[i] >= 1) {
            active[count++] = i;
            spikeCounts[i]++;
            potential[i] = 0;
            refractory[i] = 2;
          }
        }
        for (let j = 0; j < count; j++) {
          const source = active[j];
          for (
            let edge = graph.offsets[source];
            edge < graph.offsets[source + 1];
            edge++
          ) {
            pending[graph.targets[edge]] += graph.weights[edge] * 4;
          }
        }
      }
    },
    snapshot() {
      return spikeCounts.slice();
    },
  };
}
