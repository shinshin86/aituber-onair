import { validateBrainGraph, type BrainGraph } from './graph.js';
import {
  bounded,
  type BrainActivity,
  type BrainReadoutFrame,
  type NoiseModulator,
  type NoiseModulatorInput,
} from './modulation.js';
import { createBrainSimulator } from './simulator.js';

export interface BrainActivityTrace {
  frames: Uint8Array[];
  stepsPerFrame: number;
  dtMs: number;
}

export interface NoiseBrain extends NoiseModulator {
  /** Start a new isolated session. */
  reset(): void;
  /** Detached binned spike counts, at most 64 frames; empty unless captureActivity is enabled. */
  getActivityTrace(): BrainActivityTrace;
  /** Detached last-turn activity, aligned with getBodyIds(). No geometry implied. */
  getActivitySnapshot(): Uint32Array;
  getBodyIds(): Uint32Array;
  readonly neuronCount: number;
  readonly edgeCount: number;
}
export interface NoiseBrainOptions {
  /** Preserve membrane/synaptic state between turns, with an 8 ms quiet interval. */
  retainState?: boolean;
  /** Opt-in temporal activity for visualization; no allocation when omitted. */
  captureActivity?: boolean;
  /** Compact per-bin readout, independent of full visualization frames. */
  captureReadout?: boolean;
  seed?: number;
  steps?: number;
  dtMs?: number;
}
export interface VirtualNoiseBrainOptions extends NoiseBrainOptions {
  neurons?: number;
  connectionsPerNeuron?: number;
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createVirtualNoiseBrain(
  options: VirtualNoiseBrainOptions = {}
): NoiseBrain {
  const n = options.neurons ?? 1024;
  const degree = options.connectionsPerNeuron ?? 16;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 16384 ||
    !Number.isInteger(degree) ||
    degree < 1 ||
    degree > 64
  ) {
    throw new Error(
      'Virtual brain requires 32..16384 neurons and 1..64 connections per neuron'
    );
  }
  const seed = options.seed ?? 42;
  if (!Number.isSafeInteger(seed)) throw new Error('Invalid brain seed');
  const random = randomGenerator(seed);
  const graph: BrainGraph = {
    offsets: new Uint32Array(n + 1),
    bodyIds: new Uint32Array(n),
    flags: new Uint32Array(n),
    targets: new Uint32Array(n * degree),
    weights: new Float32Array(n * degree),
  };
  const incoming = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    graph.offsets[i] = i * degree;
    graph.bodyIds[i] = i;
    // Artificial populations: input quarter, readout quarter, alternating sides.
    graph.flags[i] =
      (i >= n * 0.75 ? 1 : 0) |
      (i % 2 ? 2 : 4) |
      ((i < n * 0.25 ? i % 6 : 255) << 8);
    const sign = random() < 0.2 ? -1 : 1;
    for (let j = 0; j < degree; j++) {
      const edge = i * degree + j;
      const target = Math.floor(random() * n);
      const weight = 0.5 + random();
      graph.targets[edge] = target;
      graph.weights[edge] = weight * sign;
      incoming[target] += Math.abs(graph.weights[edge]);
    }
  }
  graph.offsets[n] = n * degree;
  for (let i = 0; i < graph.weights.length; i++)
    graph.weights[i] /= incoming[graph.targets[i]] || 1;
  return createGraphNoiseBrain(graph, { ...options, provider: 'virtual' });
}

/** Graph ownership transfers to this brain. Do not mutate its arrays after creation. */
export function createGraphNoiseBrain(
  graph: BrainGraph,
  options: NoiseBrainOptions & { provider: 'virtual' | 'malecns' }
): NoiseBrain {
  validateBrainGraph(graph);
  const steps = options.steps ?? 24;
  const dtMs = options.dtMs ?? 1;
  const seed = options.seed ?? 42;
  if (
    !Number.isInteger(steps) ||
    steps < 1 ||
    steps > 1000 ||
    !Number.isFinite(dtMs) ||
    dtMs <= 0 ||
    dtMs > 5 ||
    !Number.isSafeInteger(seed)
  )
    throw new Error('Invalid brain options');
  const simulator = createBrainSimulator(graph);
  const groups: Uint32Array[] = [];
  for (let channel = 0; channel < 6; channel++) {
    const indexes: number[] = [];
    for (let i = 0; i < graph.flags.length; i++)
      if (((graph.flags[i] >>> 8) & 255) === channel) indexes.push(i);
    groups.push(Uint32Array.from(indexes));
  }
  if (!groups.some((g) => g.length) || !graph.flags.some((f) => (f & 1) !== 0))
    throw new Error('Graph requires input and readout populations');
  const projections = new Float32Array(graph.bodyIds.length * 4);
  const random = randomGenerator(seed);
  for (let i = 0; i < projections.length; i++)
    projections[i] = random() < 0.5 ? -1 : 1;
  const stride = Math.ceil(steps / 64);
  let frames: Uint8Array[] = [];
  const previous = options.captureActivity
    ? new Uint32Array(graph.bodyIds.length)
    : undefined;
  const readoutIndexes = Array.from(graph.flags.keys()).filter(
    (i) => (graph.flags[i] & 1) !== 0
  );
  // Remove population-size bias from the designed projections.
  for (let a = 0; a < 4; a++) {
    const mean =
      readoutIndexes.reduce((sum, i) => sum + projections[i * 4 + a], 0) /
      readoutIndexes.length;
    for (const i of readoutIndexes) projections[i * 4 + a] -= mean;
  }
  const readoutPrevious = options.captureReadout
    ? new Uint32Array(readoutIndexes.length)
    : undefined;
  return {
    reset() {
      simulator.reset();
      frames = [];
    },
    getActivityTrace: () => ({
      frames: frames.map((frame) => frame.slice()),
      stepsPerFrame: stride,
      dtMs,
    }),
    neuronCount: graph.bodyIds.length,
    edgeCount: graph.targets.length,
    getBodyIds: () => graph.bodyIds.slice(),
    getActivitySnapshot: () => simulator.snapshot(),
    async modulate(input) {
      const vector = encode(input);
      const keys = input.readoutKeys;
      if (
        keys &&
        (!options.captureReadout ||
          !keys.length ||
          keys.length > 64 ||
          !keys.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff))
      )
        throw new Error(
          'Invalid content readout keys or captureReadout disabled'
        );
      // Each content key binds a balanced population projection. The binding is
      // stable, not a per-turn random draw. Uniform activity contributes zero.
      const contentProjections = keys?.map((key) => {
        const values = Float32Array.from(readoutIndexes, (i) => {
          let h = (key ^ Math.imul(graph.bodyIds[i] + 1, 0x9e3779b1)) >>> 0;
          h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
          h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
          return (h ^ (h >>> 16)) & 1 ? 1 : -1;
        });
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        for (let i = 0; i < values.length; i++) values[i] -= mean;
        return values;
      });
      if (options.retainState) {
        simulator.run({ steps: 8, dtMs: 1 });
        simulator.clearCounts();
      } else simulator.reset();
      frames = [];
      previous?.fill(0);
      readoutPrevious?.fill(0);
      const readoutTrace: BrainReadoutFrame[] = [];
      let binStart = 0;
      // Fixed deterministic pulses. Each pulse is followed by propagation.
      for (let step = 0; step < steps; step++) {
        if (step % 4 === 0) {
          for (let c = 0; c < 6; c++)
            simulator.stimulate(
              groups[c],
              input.stimulus ? 2.5 * vector[c] : 0.3 + 1.5 * vector[c]
            );
        }
        simulator.run({ steps: 1, dtMs });
        if (
          readoutPrevious &&
          ((step + 1) % stride === 0 || step === steps - 1)
        ) {
          let spikes = 0;
          let squares = 0;
          const contentAxes = keys?.map(() => 0);
          const axes = [0, 0, 0, 0];
          for (let j = 0; j < readoutIndexes.length; j++) {
            const i = readoutIndexes[j];
            const count = simulator.spikeCounts[i] - readoutPrevious[j];
            readoutPrevious[j] = simulator.spikeCounts[i];
            spikes += count;
            squares += count * count;
            contentProjections?.forEach((projection, k) => {
              if (contentAxes) contentAxes[k] += count * projection[j];
            });
            for (let a = 0; a < 4; a++)
              axes[a] += count * projections[i * 4 + a];
          }
          const duration = step + 1 - binStart;
          readoutTrace.push({
            startStep: binStart,
            endStep: step + 1,
            activity: spikes / (readoutIndexes.length * duration),
            ...(contentAxes
              ? {
                  contentAxes: contentAxes.map((v) =>
                    Math.tanh(
                      v /
                        Math.max(
                          1,
                          Math.sqrt(
                            Math.max(
                              0,
                              squares -
                                (spikes * spikes) / readoutIndexes.length
                            )
                          )
                        )
                    )
                  ),
                }
              : {}),
            axes: axes.map((v) =>
              Math.tanh(
                v /
                  Math.max(1, Math.sqrt(readoutIndexes.length) * duration * 0.1)
              )
            ),
          });
          binStart = step + 1;
        }
        if (previous && ((step + 1) % stride === 0 || step === steps - 1)) {
          const frame = new Uint8Array(previous.length);
          for (let i = 0; i < previous.length; i++) {
            frame[i] = simulator.spikeCounts[i] - previous[i];
            previous[i] = simulator.spikeCounts[i];
          }
          frames.push(frame);
        }
      }
      const state = readout(graph, simulator.spikeCounts, projections, steps);
      return {
        provider: options.provider,
        ...(keys ? { contentKeys: [...keys] } : {}),
        ...(readoutPrevious ? { readoutTrace } : {}),
        intensityScale: 1 + 0.25 * Math.tanh(state.globalActivity * 8 - 0.5),
        interventionBias: {
          contrarian_reframe: state.axes[0] * 0.25,
          self_repair: state.axes[1] * 0.25,
          unfinished_margin: state.axes[1] * 0.2,
          boke_bait: state.axes[2] * 0.25,
          tsukkomi: state.axes[2] * 0.2,
        },
        personaDelta: {
          volatility: state.axes[3] * 0.2,
          humor: state.axes[2] * 0.2,
          warmth: -state.axes[0] * 0.1,
          bluntness: state.axes[0] * 0.1,
          politeness: -state.axes[3] * 0.1,
        },
        brainState: state,
      };
    },
  };
}

function encode(input: NoiseModulatorInput): number[] {
  if (input.stimulus) {
    if (
      input.stimulus.length !== 6 ||
      !input.stimulus.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    )
      throw new Error('Invalid brain stimulus');
    return [...input.stimulus];
  }
  const c = input.context;
  const intents = [
    'unknown',
    'question',
    'praise',
    'repeat',
    'banter',
    'complaint',
    'trouble',
  ];
  return [
    c.userEnergy,
    c.streamTension,
    c.repetitionLevel,
    input.diagnosis.score,
    c.personaVolatility,
    Math.max(0, intents.indexOf(c.viewerIntent)) / 6,
  ].map((v) => bounded(v, 0, 1));
}

function readout(
  graph: BrainGraph,
  counts: Uint32Array,
  projections: Float32Array,
  steps: number
): BrainActivity {
  let total = 0;
  let descending = 0;
  let descendingCount = 0;
  let left = 0;
  let right = 0;
  let sumSquares = 0;
  const axes = [0, 0, 0, 0];
  for (let i = 0; i < counts.length; i++) {
    const count = counts[i];
    total += count;
    sumSquares += count * count;
    if (graph.flags[i] & 2) left += count;
    if (graph.flags[i] & 4) right += count;
    if (graph.flags[i] & 1) {
      descending += count;
      descendingCount++;
      for (let a = 0; a < 4; a++) axes[a] += count * projections[i * 4 + a];
    }
  }
  return {
    globalActivity: total / (counts.length * steps),
    descendingActivity: descending / (Math.max(1, descendingCount) * steps),
    leftRightBalance: (left - right) / Math.max(1, left + right),
    dispersion:
      Math.sqrt(
        Math.max(0, sumSquares / counts.length - (total / counts.length) ** 2)
      ) / steps,
    axes: axes.map((v) =>
      Math.tanh(v / Math.max(1, Math.sqrt(descendingCount) * steps * 0.1))
    ),
  };
}
